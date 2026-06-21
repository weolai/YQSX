package com.gec.shop.order.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 热点参数限流演示控制器
 * 注意：方法上必须贴@SentinelResource注解，否则热点规则无效
 */
@RestController
@Slf4j
public class HotSpotController {

    @RequestMapping("/hotSpot1")
    @SentinelResource(value = "order.hotSpot1Demo")
    public String hotSpot1(Long productId) {
        log.info("访问编号为:{}的商品", productId);
        return "hotSpot1";
    }
}
