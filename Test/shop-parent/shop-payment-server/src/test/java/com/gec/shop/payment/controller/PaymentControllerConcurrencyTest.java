package com.gec.shop.payment.controller;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.payment.feign.OrderFeignClient;
import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.payment.pojo.PaymentResult;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * 支付并发集成测试：使用真实 Redis 锁验证重复支付防护。
 * 前置条件：本地 Redis（localhost:6379）可访问。
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.cloud.sentinel.enabled=false",
        "sentinel.rule.enabled=false"
})
class PaymentControllerConcurrencyTest {

    @Autowired
    private PaymentController paymentController;

    @Autowired
    private PaymentMapper paymentMapper;

    @MockBean
    private OrderFeignClient orderFeignClient;

    @BeforeEach
    void setUp() {
        FlowRule rule = new FlowRule();
        rule.setResource("payment.pay");
        rule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        rule.setCount(Integer.MAX_VALUE);
        rule.setStrategy(RuleConstant.STRATEGY_DIRECT);
        rule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT);
        rule.setLimitApp("default");
        FlowRuleManager.loadRules(Collections.singletonList(rule));

        paymentMapper.delete(Wrappers.emptyWrapper());

        Long orderId = 99L;
        Order order = new Order();
        order.setId(orderId);
        order.setUid(1L);
        order.setStatus("WAIT_PAY");
        order.setProductPrice(new BigDecimal("10.00"));
        order.setNumber(2);

        when(orderFeignClient.getById(orderId)).thenReturn(order);
        when(orderFeignClient.updateStatus(anyLong(), anyString())).thenReturn("success");
    }

    @Test
    void shouldOnlyAllowOneConcurrentPaymentForSameOrder() throws Exception {
        int threadCount = 5;
        Long orderId = 99L;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger lockedCount = new AtomicInteger(0);

        Future<?>[] futures = new Future[threadCount];
        for (int i = 0; i < threadCount; i++) {
            futures[i] = executor.submit(() -> {
                try {
                    startLatch.await();
                    PaymentResult result = paymentController.pay(orderId);
                    int code = result.getCode();
                    if (code == 200 && "支付成功".equals(result.getMsg())) {
                        successCount.incrementAndGet();
                    } else if (code == 429 && result.getMsg().contains("订单正在支付中")) {
                        lockedCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // ignore interrupted
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(finished, "所有并发请求应在 30 秒内完成");

        for (Future<?> future : futures) {
            future.get();
        }
        executor.shutdown();

        assertEquals(1, successCount.get(), "同一订单只允许一次成功支付");
        assertEquals(threadCount - 1, lockedCount.get(), "其余请求应被 Redis 锁拦截");
        assertEquals(1L, paymentMapper.selectCount(Wrappers.emptyWrapper()), "数据库中应只有一条支付记录");
    }
}
