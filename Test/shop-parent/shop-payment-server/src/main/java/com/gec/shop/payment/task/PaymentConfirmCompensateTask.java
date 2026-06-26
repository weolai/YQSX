package com.gec.shop.payment.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.payment.feign.OrderFeignClient;
import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.payment.pojo.Payment;
import com.gec.shop.payment.service.PaymentInternalService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 支付确认补偿定时任务
 *
 * 职责:
 * - 扫描 t_payment 中 status=4 (PENDING_CONFIRM) 的支付记录
 * - 通过 Feign 查询关联订单真实状态
 *   - 订单已 PAID: 说明 Feign 超时但订单实际更新成功,标记支付为 SUCCESS
 *   - 订单仍 WAIT_PAY: 说明订单未更新成功,删除支付记录(经 PaymentInternalService REQUIRES_NEW 事务)
 *
 * 多实例安全: 依赖 t_payment 唯一索引 + status CAS 更新,不引入 ShedLock
 *
 * 调度:每 30 秒执行一次
 */
@Slf4j
@Component
public class PaymentConfirmCompensateTask {

    /**
     * 支付状态常量(与 PaymentServiceImpl 保持一致)
     */
    private static final int STATUS_SUCCESS = 1;
    private static final int STATUS_PENDING_CONFIRM = 4;

    @Autowired
    private PaymentMapper paymentMapper;

    @Autowired
    private OrderFeignClient orderFeignClient;

    @Autowired
    private PaymentInternalService paymentInternalService;

    @Scheduled(fixedDelay = 30_000)
    public void compensate() {
        List<Payment> pendingList = paymentMapper.selectList(
                new LambdaQueryWrapper<Payment>()
                        .eq(Payment::getStatus, STATUS_PENDING_CONFIRM)
                        .last("LIMIT 50")
        );

        if (pendingList.isEmpty()) {
            return;
        }
        log.info("支付确认补偿任务扫描到 {} 条待确认记录", pendingList.size());

        for (Payment payment : pendingList) {
            processOne(payment);
        }
    }

    /**
     * 处理单条待确认支付记录
     */
    private void processOne(Payment payment) {
        try {
            Order order = orderFeignClient.getById(payment.getOrderId());
            if (order == null) {
                log.warn("支付确认补偿: 订单不存在,保留支付记录待人工处理: paymentId={}, orderId={}",
                        payment.getId(), payment.getOrderId());
                return;
            }

            if ("PAID".equals(order.getStatus())) {
                // 订单已支付成功(Feign 超时但实际更新成功),标记支付为 SUCCESS
                markPaymentSuccess(payment);
                log.info("支付确认补偿成功: 订单已 PAID, paymentId={}, orderId={}",
                        payment.getId(), payment.getOrderId());
            } else if ("WAIT_PAY".equals(order.getStatus())) {
                // 订单仍为待支付,说明状态更新确实失败,删除支付记录
                paymentInternalService.compensateDeletePayment(payment.getId());
                log.info("支付确认补偿: 订单未 PAID, 已删除支付记录: paymentId={}, orderId={}",
                        payment.getId(), payment.getOrderId());
            } else {
                // 订单状态异常(如 CANCELED),删除支付记录并记录
                paymentInternalService.compensateDeletePayment(payment.getId());
                log.warn("支付确认补偿: 订单状态异常({}), 已删除支付记录: paymentId={}, orderId={}",
                        order.getStatus(), payment.getId(), payment.getOrderId());
            }
        } catch (Exception e) {
            // Feign 调用订单查询失败,本次跳过,等待下次扫描
            log.warn("支付确认补偿: 查询订单失败, 等待下次扫描: paymentId={}, orderId={}",
                    payment.getId(), payment.getOrderId(), e);
        }
    }

    /**
     * 标记支付记录为成功
     */
    private void markPaymentSuccess(Payment payment) {
        Payment update = new Payment();
        update.setId(payment.getId());
        update.setStatus(STATUS_SUCCESS);
        update.setRemark("补偿确认:订单已支付");
        paymentMapper.updateById(update);
    }
}
