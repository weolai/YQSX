package com.gec.shop.payment.pojo;

import lombok.Data;

/**
 * 支付处理结果 DTO
 * 替代原先散落在各分支的 Map<String,Object> 构造，统一结果模型。
 * JSON 序列化字段名与原 Map key 保持一致（code/msg/orderId/paymentId/orderUpdateResult/status）。
 */
@Data
public class PaymentResult {

    private int code;
    private String msg;
    private Long orderId;
    private Long paymentId;
    private String orderUpdateResult;
    private String status;

    /**
     * 通用结果构造
     */
    public static PaymentResult of(int code, String msg, Long orderId) {
        PaymentResult r = new PaymentResult();
        r.code = code;
        r.msg = msg;
        r.orderId = orderId;
        return r;
    }

    /**
     * 支付成功结果
     */
    public static PaymentResult success(Long orderId, Long paymentId, String orderUpdateResult) {
        PaymentResult r = new PaymentResult();
        r.code = 200;
        r.msg = "支付成功";
        r.orderId = orderId;
        r.paymentId = paymentId;
        r.orderUpdateResult = orderUpdateResult;
        return r;
    }

    /**
     * 订单已支付（重复支付提示）
     */
    public static PaymentResult alreadyPaid(Long orderId) {
        PaymentResult r = new PaymentResult();
        r.code = 200;
        r.msg = "订单已支付，请勿重复支付";
        r.orderId = orderId;
        r.status = "PAID";
        return r;
    }

    /**
     * 是否支付成功（code == 200）
     */
    public boolean isSuccess() {
        return code == 200;
    }
}
