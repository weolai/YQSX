package com.gec.shop.order.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 降级规则演示控制器
 * 包含三种降级策略的案例：
 * 1. 慢调用比例降级
 * 2. 异常比例降级
 * 3. 异常数降级
 */
@RestController
@Slf4j
public class FallBackController {

    /**
     * 使用 AtomicInteger 保证多线程环境下的计数器线程安全
     */
    private final AtomicInteger counter = new AtomicInteger(0);

    /**
     * 慢调用比例降级案例
     * 模拟业务耗时操作（sleep 1秒）
     */
    @RequestMapping("/fallBack1")
    public String fallBack1() {
        try {
            log.info("fallBack1执行业务逻辑");
            // 模拟业务耗时
            TimeUnit.SECONDS.sleep(1);
        } catch (InterruptedException e) {
            log.error("fallBack1执行被中断", e);
            Thread.currentThread().interrupt();
        }
        return "fallBack1";
    }

    /**
     * 异常比例降级案例
     * 每3次请求抛出一次异常（异常比例33%）
     */
    @RequestMapping("/fallBack2")
    public String fallBack2() {
        log.info("fallBack2执行业务逻辑");
        // 模拟出现异常，异常比例为33%
        if (counter.incrementAndGet() % 3 == 0) {
            throw new RuntimeException("模拟异常");
        }
        return "fallBack2";
    }

    /**
     * 异常数降级案例
     * 当参数为dafei时抛出异常
     */
    @RequestMapping("/fallBack3")
    public String fallBack3(String name) {
        log.info("fallBack3执行业务逻辑, name={}", name);
        if ("dafei".equals(name)) {
            throw new RuntimeException("模拟异常");
        }
        return "fallBack3";
    }
}
