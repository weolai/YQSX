package com.gec.shop.payment.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.payment.feign.OrderFeignClient;
import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.payment.pojo.Payment;
import com.gec.shop.payment.pojo.PaymentResult;
import com.gec.shop.payment.service.PaymentService;
import com.gec.shop.common.util.RedisLockUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 支付记录 Service 实现类
 */
@Slf4j
@Service
public class PaymentServiceImpl implements PaymentService {

    @Autowired
    private PaymentMapper paymentMapper;

    @Autowired
    private OrderFeignClient orderFeignClient;

    @Autowired
    private RedisLockUtil redisLockUtil;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean save(Payment payment) {
        return paymentMapper.insert(payment) > 0;
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
     * 事务边界设计：
     * 1. Redis 锁防重复支付（事务外）
     * 2. Feign 查询订单（事务外，避免长事务持有连接）
     * 3. 本地事务仅覆盖支付记录写入
     * 4. Feign 更新订单状态（事务外，失败需补偿）
     *
     * 补偿策略：若订单状态更新失败，删除已写入的支付记录（最佳努力）
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
     * 尝试获取分布式锁
     */
    private boolean tryAcquireLock(String lockKey, String lockValue) {
        return redisLockUtil.tryLock(lockKey, lockValue, 30);
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
        if (!save(payment)) {
            return PaymentResult.of(500, "支付记录保存失败", orderId);
        }

        return updateOrderStatusOrCompensate(orderId, payment);
    }

    /**
     * 校验订单存在性与可支付状态，校验通过返回 null，否则返回错误结果
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
     * 更新订单状态为 PAID，Feign 调用失败或返回非 success 时补偿删除支付记录
     */
    private PaymentResult updateOrderStatusOrCompensate(Long orderId, Payment payment) {
        String updateResult;
        try {
            updateResult = orderFeignClient.updateStatus(orderId, "PAID");
        } catch (Exception e) {
            log.error("订单状态更新失败，补偿删除支付记录: orderId={}, paymentId={}", orderId, payment.getId(), e);
            compensateDeletePayment(payment.getId());
            return PaymentResult.of(500, "订单状态更新失败，支付已回滚", orderId);
        }
        if (!"success".equals(updateResult)) {
            log.error("订单状态更新失败: orderId={}, result={}", orderId, updateResult);
            compensateDeletePayment(payment.getId());
            return PaymentResult.of(500, "订单状态更新失败: " + updateResult, orderId);
        }
        return PaymentResult.success(orderId, payment.getId(), updateResult);
    }

    /**
     * 创建支付记录
     * 金额计算使用 BigDecimal 全程，避免 Double 精度丢失
     */
    private Payment createPayment(Order order) {
        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        payment.setUserId(order.getUid());
        // 实体类已改为 BigDecimal，直接使用避免精度转换
        BigDecimal unitPrice = order.getProductPrice();
        BigDecimal amount = unitPrice.multiply(BigDecimal.valueOf(order.getNumber()));
        payment.setAmount(amount);
        payment.setPayType(1);
        payment.setStatus(1);
        payment.setTransactionNo(generateTransactionNo());
        payment.setPayTime(LocalDateTime.now());
        payment.setRemark("支付成功");
        return payment;
    }

    /**
     * 生成交易流水号：PAY + yyyyMMddHHmmss + 6位随机数
     * 数据库唯一索引兜底，防止并发重复
     */
    private String generateTransactionNo() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int random = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return "PAY" + timestamp + random;
    }

    /**
     * 补偿删除支付记录（订单状态更新失败时调用）
     */
    @Transactional(rollbackFor = Exception.class)
    public void compensateDeletePayment(Long paymentId) {
        try {
            paymentMapper.deleteById(paymentId);
            log.info("补偿删除支付记录成功: paymentId={}", paymentId);
        } catch (Exception e) {
            log.error("补偿删除支付记录失败，需人工处理: paymentId={}", paymentId, e);
        }
    }
}
