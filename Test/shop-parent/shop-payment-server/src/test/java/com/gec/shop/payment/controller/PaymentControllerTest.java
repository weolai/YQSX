package com.gec.shop.payment.controller;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.payment.feign.OrderFeignClient;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.common.util.RedisLockUtil;

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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

/**
 * PaymentController 边界测试：幂等性、异常回滚与 Redis 锁行为。
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.cloud.sentinel.enabled=false",
        "sentinel.rule.enabled=false"
})
class PaymentControllerTest {

    @Autowired
    private PaymentController paymentController;

    @Autowired
    private PaymentMapper paymentMapper;

    @MockBean
    private OrderFeignClient orderFeignClient;

    @MockBean
    private RedisLockUtil redisLockUtil;

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
        when(redisLockUtil.tryLock(anyString(), anyString(), anyLong())).thenReturn(true);
        doNothing().when(redisLockUtil).unlock(anyString(), anyString());
    }

    private Order buildWaitPayOrder(Long orderId) {
        Order order = new Order();
        order.setId(orderId);
        order.setUid(1L);
        order.setStatus("WAIT_PAY");
        order.setProductPrice(new BigDecimal("10.00"));
        order.setNumber(2);
        return order;
    }

    /**
     * 幂等性：同一订单支付两次，第二次应返回已支付，且只产生一条支付记录。
     */
    @Test
    void shouldBeIdempotentWhenPaySameOrderTwice() {
        Long orderId = 1L;
        Order order = buildWaitPayOrder(orderId);

        when(orderFeignClient.getById(orderId))
                .thenReturn(order)
                .thenReturn(order);
        when(orderFeignClient.updateStatus(orderId, "PAID"))
                .thenReturn("success")
                .thenReturn("success");

        Map<String, Object> firstResult = paymentController.pay(orderId);
        assertEquals(200, firstResult.get("code"));
        assertEquals("支付成功", firstResult.get("msg"));
        assertEquals(1L, paymentMapper.selectCount(Wrappers.emptyWrapper()));

        order.setStatus("PAID");
        Map<String, Object> secondResult = paymentController.pay(orderId);
        assertEquals(200, secondResult.get("code"));
        assertEquals("订单已支付，请勿重复支付", secondResult.get("msg"));
        assertEquals(1L, paymentMapper.selectCount(Wrappers.emptyWrapper()), "重复支付不应新增支付记录");
    }

    /**
     * 异常回滚：订单状态更新失败时，支付记录不应落库。
     */
    @Test
    void shouldRollbackPaymentWhenOrderUpdateFails() {
        Long orderId = 2L;
        Order order = buildWaitPayOrder(orderId);

        when(orderFeignClient.getById(orderId)).thenReturn(order);
        when(orderFeignClient.updateStatus(orderId, "PAID")).thenReturn("failed");

        Map<String, Object> result = paymentController.pay(orderId);

        assertEquals(500, result.get("code"));
        String msg = (String) result.get("msg");
        assertTrue(msg.contains("订单状态更新失败"), "失败原因应包含订单状态更新失败");
        assertEquals(0L, paymentMapper.selectCount(Wrappers.emptyWrapper()), "事务回滚后不应存在支付记录");
    }

    /**
     * 订单状态异常：非 WAIT_PAY/PAID 状态时直接拒绝，不产生支付记录。
     */
    @Test
    void shouldRejectWhenOrderStatusIsInvalid() {
        Long orderId = 3L;
        Order order = buildWaitPayOrder(orderId);
        order.setStatus("FINISHED");

        when(orderFeignClient.getById(orderId)).thenReturn(order);

        Map<String, Object> result = paymentController.pay(orderId);

        assertEquals(400, result.get("code"));
        assertTrue(((String) result.get("msg")).contains("订单状态异常"));
        assertEquals(0L, paymentMapper.selectCount(Wrappers.emptyWrapper()));
    }

    /**
     * Redis 锁失败：当锁被占用时返回 429，且不应查询订单或写入支付记录。
     */
    @Test
    void shouldReturn429WhenRedisLockFails() {
        Long orderId = 4L;
        when(redisLockUtil.tryLock(anyString(), anyString(), anyLong())).thenReturn(false);

        Map<String, Object> result = paymentController.pay(orderId);

        assertEquals(429, result.get("code"));
        assertTrue(((String) result.get("msg")).contains("订单正在支付中"));
        assertEquals(0L, paymentMapper.selectCount(Wrappers.emptyWrapper()), "锁失败时不应产生支付记录");
    }

    /**
     * 金额计算：支付金额应等于商品单价乘以数量。
     */
    @Test
    void shouldCalculatePaymentAmountCorrectly() {
        Long orderId = 5L;
        Order order = buildWaitPayOrder(orderId);
        order.setProductPrice(new BigDecimal("12.50"));
        order.setNumber(3);

        when(orderFeignClient.getById(orderId)).thenReturn(order);
        when(orderFeignClient.updateStatus(orderId, "PAID")).thenReturn("success");

        Map<String, Object> result = paymentController.pay(orderId);

        assertEquals(200, result.get("code"));
        assertEquals(1L, paymentMapper.selectCount(Wrappers.emptyWrapper()));

        com.gec.shop.payment.pojo.Payment payment = paymentMapper.selectList(Wrappers.emptyWrapper()).get(0);
        assertEquals(0, payment.getAmount().compareTo(new java.math.BigDecimal("37.50")), "金额应为 12.5 * 3 = 37.50");
        assertEquals(orderId, payment.getOrderId());
        assertEquals(order.getUid(), payment.getUserId());
    }
}
