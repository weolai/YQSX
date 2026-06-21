package com.gec.shop.payment.config;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@ConditionalOnProperty(name = "sentinel.rule.enabled", havingValue = "true", matchIfMissing = true)
public class SentinelRuleConfig implements CommandLineRunner {

    @Override
    public void run(String... args) {
        if (!FlowRuleManager.getRules().isEmpty()) {
            return;
        }
        FlowRule rule = new FlowRule();
        rule.setResource("payment.pay");
        rule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        rule.setCount(2);
        rule.setStrategy(RuleConstant.STRATEGY_DIRECT);
        rule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT);
        rule.setLimitApp("default");
        FlowRuleManager.loadRules(Collections.singletonList(rule));
    }
}
