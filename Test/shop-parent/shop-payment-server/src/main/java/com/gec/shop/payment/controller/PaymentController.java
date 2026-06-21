package com.gec.shop.payment.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.payment.feign.OrderFeignClient;
import com.gec.shop.payment.pojo.Payment;
import com.gec.shop.payment.service.PaymentService;
import com.gec.shop.payment.util.RedisLockUtil;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("payment")
public class PaymentController {

    @Value("${server.port}")
    private String port;

    @Autowired
    private OrderFeignClient orderFeignClient;

    @Autowired
    private RedisLockUtil redisLockUtil;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private MeterRegistry meterRegistry;

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

    @PostMapping("/pay")
    @SentinelResource(value = "payment.pay", blockHandler = "payOrderBlockHandler")
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> pay(@RequestParam Long orderId) {
        return orderPayLatencyTimer.record(() -> doPay(orderId));
    }

    private Map<String, Object> doPay(Long orderId) {
        Map<String, Object> result = new HashMap<>();
        String lockKey = "payment:lock:" + orderId;
        String lockValue = Thread.currentThread().getId() + "-" + System.nanoTime();

        boolean locked = redisLockUtil.tryLock(lockKey, lockValue, 30);
        if (!locked) {
            result.put("code", 429);
            result.put("msg", "order is paying, please do not repeat");
            result.put("orderId", orderId);
            return result;
        }

        try {
            Order order = orderFeignClient.getById(orderId);
            if (order == null) {
                result.put("code", 404);
                result.put("msg", "订单不存在");
                return result;
            }
            if ("PAID".equals(order.getStatus())) {
                result.put("code", 200);
                result.put("msg", "order already paid, please do not repeat");
                result.put("orderId", orderId);
                result.put("status", "PAID");
                return result;
            }
            if (!"WAIT_PAY".equals(order.getStatus())) {
                result.put("code", 400);
                result.put("msg", "订单状态异常，当前状态: " + order.getStatus());
                result.put("orderId", orderId);
                return result;
            }
            Payment payment = new Payment();
            payment.setOrderId(orderId);
            payment.setUserId(order.getUid());
            BigDecimal amount = BigDecimal.valueOf(order.getProductPrice() * order.getNumber());
            payment.setAmount(amount);
            payment.setPayType(1);
            payment.setStatus(1);
            payment.setPayTime(LocalDateTime.now());
            payment.setRemark("支付成功");
            paymentService.save(payment);

            String updateResult = orderFeignClient.updateStatus(orderId, "PAID");
            if (!"success".equals(updateResult)) {
                throw new RuntimeException("订单状态更新失败: " + updateResult);
            }

            result.put("code", 200);
            result.put("msg", "payment success");
            result.put("orderId", orderId);
            result.put("paymentId", payment.getId());
            result.put("orderUpdateResult", updateResult);
            paymentSuccessCounter.increment();
        } catch (Exception e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            result.put("code", 500);
            result.put("msg", "payment failed: " + e.getMessage());
        } finally {
            redisLockUtil.unlock(lockKey, lockValue);
        }
        return result;
    }

    public Map<String, Object> payOrderBlockHandler(Long orderId, BlockException e) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 429);
        result.put("msg", "支付通道繁忙，请稍后再试");
        result.put("orderId", orderId);
        return result;
    }
}
