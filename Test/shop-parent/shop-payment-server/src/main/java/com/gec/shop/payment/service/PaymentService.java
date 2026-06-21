package com.gec.shop.payment.service;

import com.gec.shop.payment.pojo.Payment;

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
}
