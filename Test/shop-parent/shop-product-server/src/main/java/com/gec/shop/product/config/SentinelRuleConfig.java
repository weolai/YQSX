package com.gec.shop.product.config;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRule;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRuleManager;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Sentinel 规则初始化配置
 * <p>
 * 为推荐、识别等外部依赖较重的接口预设流控与熔断规则，
 * 防止 Python 算法服务故障或流量突增压垮 product-service。
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "sentinel.rule.enabled", havingValue = "true", matchIfMissing = true)
public class SentinelRuleConfig implements CommandLineRunner {

    /**
     * DIN 推荐接口 QPS 阈值
     */
    private static final double DIN_TOPK_QPS = 10.0;

    /**
     * 拍照识别接口 QPS 阈值（识别服务 heavier，阈值更低）
     */
    private static final double RECOGNIZE_QPS = 5.0;

    @Override
    public void run(String... args) {
        if (!FlowRuleManager.getRules().isEmpty()) {
            return;
        }

        // 1. 流控规则：限制推荐和识别接口 QPS
        FlowRule dinTopKFlowRule = new FlowRule();
        dinTopKFlowRule.setResource("product.dinTopK");
        dinTopKFlowRule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        dinTopKFlowRule.setCount(DIN_TOPK_QPS);
        dinTopKFlowRule.setStrategy(RuleConstant.STRATEGY_DIRECT);
        dinTopKFlowRule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT);
        dinTopKFlowRule.setLimitApp("default");

        FlowRule recognizeFlowRule = new FlowRule();
        recognizeFlowRule.setResource("product.recognize");
        recognizeFlowRule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        recognizeFlowRule.setCount(RECOGNIZE_QPS);
        recognizeFlowRule.setStrategy(RuleConstant.STRATEGY_DIRECT);
        recognizeFlowRule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT);
        recognizeFlowRule.setLimitApp("default");

        FlowRuleManager.loadRules(Arrays.asList(dinTopKFlowRule, recognizeFlowRule));
        log.info("Sentinel 流控规则已加载: product.dinTopK QPS={}, product.recognize QPS={}",
                DIN_TOPK_QPS, RECOGNIZE_QPS);

        // 2. 熔断规则：当 DIN 推荐接口异常比例过高时自动熔断
        DegradeRule dinTopKDegradeRule = new DegradeRule();
        dinTopKDegradeRule.setResource("product.dinTopK");
        // 异常比例熔断：5 秒内异常比例超过 60% 且请求数 ≥ 10 时熔断 10 秒
        // 参数经校准：统计窗口 5s 避免低流量抖动误触发，最小请求 10 防止小流量误判
        dinTopKDegradeRule.setGrade(RuleConstant.DEGRADE_GRADE_EXCEPTION_RATIO);
        dinTopKDegradeRule.setCount(0.6);
        dinTopKDegradeRule.setTimeWindow(10);
        dinTopKDegradeRule.setMinRequestAmount(10);
        dinTopKDegradeRule.setStatIntervalMs(5000);

        DegradeRuleManager.loadRules(Arrays.asList(dinTopKDegradeRule));
        log.info("Sentinel 熔断规则已加载: product.dinTopK 异常比例熔断");
    }
}
