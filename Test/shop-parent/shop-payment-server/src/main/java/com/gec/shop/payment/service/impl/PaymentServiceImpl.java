package com.gec.shop.payment.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.payment.feign.OrderFeignClient;
import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.payment.pojo.Payment;
import com.gec.shop.payment.pojo.PaymentResult;
import com.gec.shop.payment.service.PaymentInternalService;
import com.gec.shop.payment.service.PaymentService;
import com.gec.shop.common.util.RedisLockUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 支付记录 Service 实现类
 *
 * 事务边界设计(Sprint 2 重构):
 * 1. Redis 锁防重复支付(事务外, TTL=60s)
 * 2. Feign 查询订单(事务外,避免长事务持有连接)
 * 3. 本地事务仅覆盖支付记录写入(经由 PaymentInternalService 代理调用,事务生效)
 * 4. Feign 更新订单状态(事务外)
 *
 * 补偿策略(Sprint 2 重构):
 * - 订单状态更新 Feign 超时/异常: 不立即删除支付记录,标记为 PENDING_CONFIRM(status=4)
 *   由定时任务 PaymentConfirmCompensateTask 扫描,查询订单真实状态后处理
 * - 订单状态更新返回明确失败(非超时): 删除支付记录(经 PaymentInternalService REQUIRES_NEW 事务)
 *
 * 自调用问题修复:
 * - save / compensateDeletePayment 抽取到 PaymentInternalService
 * - PaymentServiceImpl 注入 PaymentInternalService,经由 Spring 代理调用,事务生效
 */
@Slf4j
@Service
public class PaymentServiceImpl implements PaymentService {

    /**
     * 支付状态常量
     */
    private static final int STATUS_SUCCESS = 1;
    private static final int STATUS_FAILED = 2;
    private static final int STATUS_PENDING_CONFIRM = 4;

    /**
     * Redis 锁 TTL (Sprint 2: 60s,覆盖 Feign 链路,不引入看门狗)
     */
    private static final long LOCK_TTL_SECONDS = 60;

    @Autowired
    private PaymentMapper paymentMapper;

    @Autowired
    private OrderFeignClient orderFeignClient;

    @Autowired
    private RedisLockUtil redisLockUtil;

    @Autowired
    private PaymentInternalService paymentInternalService;

    @Override
    public boolean save(Payment payment) {
        // 委托给 PaymentInternalService,经由代理调用,事务生效
        return paymentInternalService.save(payment);
    }

    @Override
    public Payment getByOrderId(Long orderId) {
        QueryWrapper<Payment> wrapper = new QueryWrapper<>();
        wrapper.eq("order_id", orderId);
        wrapper.eq("is_deleted", 0);
        wrapper.orderByDesc("create_time");
        wrapper.last("LIMIT 1");
        return paymentMapper.selectOne(wrapper);
    }

    /**
     * 处理支付流程
     */
    @Override
    public PaymentResult processPayment(Long orderId) {
        String lockKey = "payment:lock:" + orderId;
        String lockValue = Thread.currentThread().getId() + "-" + System.nanoTime();

        if (!tryAcquireLock(lockKey, lockValue)) {
            return PaymentResult.of(429, "订单正在支付中，请勿重复提交", orderId);
        }
        try {
            return executePayment(orderId);
        } catch (Exception e) {
            log.error("支付处理异常: orderId={}", orderId, e);
            return PaymentResult.of(500, "支付处理失败", orderId);
        } finally {
            redisLockUtil.unlock(lockKey, lockValue);
        }
    }

    /**
     * 尝试获取分布式锁(TTL=60s)
     */
    private boolean tryAcquireLock(String lockKey, String lockValue) {
        return redisLockUtil.tryLock(lockKey, lockValue, LOCK_TTL_SECONDS);
    }

    /**
     * 执行支付主流程：订单校验 → 保存支付记录 → 更新订单状态
     */
    private PaymentResult executePayment(Long orderId) {
        Order order = orderFeignClient.getById(orderId);
        PaymentResult validation = validateOrder(order, orderId);
        if (validation != null) {
            return validation;
        }

        Payment payment = createPayment(order);
        // 经由 PaymentInternalService 代理调用,事务生效
        if (!paymentInternalService.save(payment)) {
            return PaymentResult.of(500, "支付记录保存失败", orderId);
        }

        return updateOrderStatusOrCompensate(orderId, payment);
    }

    /**
     * 校验订单存在性与可支付状态
     */
    private PaymentResult validateOrder(Order order, Long orderId) {
        if (order == null) {
            return PaymentResult.of(404, "订单不存在", orderId);
        }
        if ("PAID".equals(order.getStatus())) {
            return PaymentResult.alreadyPaid(orderId);
        }
        if (!"WAIT_PAY".equals(order.getStatus())) {
            return PaymentResult.of(400, "订单状态异常，当前状态: " + order.getStatus(), orderId);
        }
        return null;
    }

    /**
     * 更新订单状态为 PAID
     *
     * 补偿策略(Sprint 2):
     * - Feign 超时/异常: 标记支付记录为 PENDING_CONFIRM,由定时任务处理(不立即删除)
     * - Feign 返回明确失败: 删除支付记录(REQUIRES_NEW 独立事务)
     */
    private PaymentResult updateOrderStatusOrCompensate(Long orderId, Payment payment) {
        String updateResult;
        try {
            updateResult = orderFeignClient.updateStatus(orderId, "PAID");
        } catch (Exception e) {
            // Feign 超时/网络异常:订单可能已更新成功,不可贸然删除支付记录
            // 标记为 PENDING_CONFIRM,由定时任务查询订单真实状态后处理
            log.error("订单状态更新异常,标记支付记录为待确认: orderId={}, paymentId={}", orderId, payment.getId(), e);
            markPaymentPendingConfirm(payment.getId());
            return PaymentResult.of(500, "订单状态更新超时，支付待确认", orderId);
        }
        if (!"success".equals(updateResult)) {
            // Feign 返回明确失败(订单状态已变更等):删除支付记录
            log.error("订单状态更新失败: orderId={}, result={}", orderId, updateResult);
            paymentInternalService.compensateDeletePayment(payment.getId());
            return PaymentResult.of(500, "订单状态更新失败: " + updateResult, orderId);
        }
        return PaymentResult.success(orderId, payment.getId(), updateResult);
    }

    /**
     * 创建支付记录
     */
    private Payment createPayment(Order order) {
        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setUserId(order.getUid());
        BigDecimal unitPrice = order.getProductPrice();
        BigDecimal amount = unitPrice.multiply(BigDecimal.valueOf(order.getNumber()));
        payment.setAmount(amount);
        payment.setPayType(1);
        payment.setStatus(STATUS_SUCCESS);
        payment.setTransactionNo(generateTransactionNo());
        payment.setPayTime(LocalDateTime.now());
        payment.setRemark("支付成功");
        return payment;
    }

    /**
     * 生成交易流水号
     */
    private String generateTransactionNo() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int random = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return "PAY" + timestamp + random;
    }

    /**
     * 标记支付记录为待确认状态(PENDING_CONFIRM)
     * 用于 Feign 超时场景,定时任务扫描后处理
     */
    private void markPaymentPendingConfirm(Long paymentId) {
        try {
            Payment update = new Payment();
            update.setId(paymentId);
            update.setStatus(STATUS_PENDING_CONFIRM);
            update.setRemark("订单状态更新超时，待确认");
            paymentMapper.updateById(update);
            log.info("支付记录已标记为待确认: paymentId={}", paymentId);
        } catch (Exception e) {
            log.error("标记支付记录为待确认失败,需人工处理: paymentId={}", paymentId, e);
        }
    }
}
