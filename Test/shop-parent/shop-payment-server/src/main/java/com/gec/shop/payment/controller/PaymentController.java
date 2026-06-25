package com.gec.shop.payment.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.payment.pojo.PaymentResult;
import com.gec.shop.payment.service.PaymentService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("payment")
public class PaymentController {

    @Value("${server.port}")
    private String port;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    private Counter paymentSuccessCounter;
    private Timer orderPayLatencyTimer;

    @Autowired
    public void initMetrics() {
        paymentSuccessCounter = Counter.builder("payment_success_total")
                .description("Total number of successful payments")
                .register(meterRegistry);
        orderPayLatencyTimer = Timer.builder("order_pay_latency")
                .description("Payment processing latency")
                .register(meterRegistry);
    }

    @GetMapping("/hello")
    public Map<String, String> hello() {
        Map<String, String> result = new HashMap<>();
        result.put("service", "shop-payment-service");
        result.put("port", port);
        result.put("msg", "payment service is running");
        return result;
    }

    /**
     * 支付接口
     * 业务逻辑委托给 Service，Controller 仅负责 HTTP 协议
     * 事务边界在 Service 层，仅覆盖本地 DB 操作
     */
    @PostMapping("/pay")
    @SentinelResource(value = "payment.pay", blockHandler = "payOrderBlockHandler")
    public PaymentResult pay(@RequestParam Long orderId) {
        PaymentResult result = orderPayLatencyTimer.record(() -> paymentService.processPayment(orderId));
        // 成功时计数
        if (result != null && result.isSuccess()) {
            paymentSuccessCounter.increment();
        }
        return result;
    }

    public PaymentResult payOrderBlockHandler(Long orderId, BlockException e) {
        return PaymentResult.of(429, "支付通道繁忙，请稍后再试", orderId);
    }
}
