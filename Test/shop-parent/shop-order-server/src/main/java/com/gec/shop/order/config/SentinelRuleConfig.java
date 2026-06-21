package com.gec.shop.order.config;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class SentinelRuleConfig implements CommandLineRunner {

    @Override
    public void run(String... args) {
        // 如果 Sentinel 中已有规则（如通过 Dashboard 配置），则不覆盖
        if (!FlowRuleManager.getRules().isEmpty()) {
            return;
        }

        List<FlowRule> rules = new ArrayList<>();

        FlowRule saveRule = new FlowRule();
        saveRule.setResource("order.create");
        saveRule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        saveRule.setCount(2);
        saveRule.setStrategy(RuleConstant.STRATEGY_DIRECT);
        saveRule.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_DEFAULT);
        saveRule.setLimitApp("default");
        rules.add(saveRule);

        FlowRuleManager.loadRules(rules);
    }
}
