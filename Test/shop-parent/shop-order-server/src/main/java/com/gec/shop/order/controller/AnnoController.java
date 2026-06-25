package com.gec.shop.order.controller;

import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.alibaba.csp.sentinel.annotation.SentinelResource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @SentinelResource注解使用演示控制器
 * 演示通过注解方式定义资源的限流处理(blockHandler)和异常降级(fallback)
 */
@RestController
@Slf4j
public class AnnoController {

    @RequestMapping("/anno1")
    @SentinelResource(value = "order.anno1Demo",
            blockHandler = "anno1BlockHandler",
            fallback = "anno1Fallback"
    )
    public String anno1(String name) {
        if ("dafei".equals(name)) {
            throw new RuntimeException("模拟业务异常");
        }
        return "anno1";
    }

    /**
     * blockHandler: 处理BlockException（限流/降级等Sentinel规则触发时的异常）
     * 要求：访问范围public，返回类型与原方法一致，参数与原方法一致+额外BlockException参数
     */
    public String anno1BlockHandler(String name, BlockException ex) {
        log.error("anno1被限流或降级了, ex={}", ex.getMessage());
        return "接口被限流或者降级了";
    }

    /**
     * fallback: 处理Throwable类型的异常（业务代码抛出的异常）
     * 要求：返回值类型必须与原函数一致，参数列表一致或多一个Throwable参数
     */
    public String anno1Fallback(String name, Throwable throwable) {
        log.error("anno1发生业务异常, throwable={}", throwable.getMessage());
        return "接口发生异常了";
    }
}
