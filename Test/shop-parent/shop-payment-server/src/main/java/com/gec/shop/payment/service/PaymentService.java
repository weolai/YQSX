package com.gec.shop.payment.service;

import com.gec.shop.payment.pojo.Payment;
import com.gec.shop.payment.pojo.PaymentResult;

/**
 * 支付记录 Service 接口
 */
public interface PaymentService {

    /**
     * 保存支付记录
     *
     * @param payment 支付记录
     * @return 是否保存成功
     */
    boolean save(Payment payment);

    /**
     * 根据订单ID查询支付记录
     *
     * @param orderId 订单ID
     * @return 支付记录
     */
    Payment getByOrderId(Long orderId);

    /**
     * 处理支付流程
     * 事务边界：仅覆盖本地支付记录写入
     * Feign 调用订单服务在事务外执行，避免长事务持有数据库连接
     *
     * @param orderId 订单ID
     * @return 支付结果
     */
    PaymentResult processPayment(Long orderId);
}
