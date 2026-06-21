package com.gec.shop.order.service;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 商品服务类，用于演示链路流控模式
 * 默认情况下，GoodService的方法是不被Sentinel监控的，
 * 需要通过@SentinelResource注解来标记要监控的方法
 */
@Slf4j
@Service
public class GoodService {

    @SentinelResource("order.queryGood")
    public void queryGood() {
        log.info("查询商品信息");
    }
}
