package com.gec.shop.order.controller;

import com.gec.shop.order.service.GoodService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
public class SentinelController {

    @Autowired
    private GoodService goodService;

    /**
     * 模拟高并发场景：该方法有1秒延时，会占用Tomcat线程
     */
    @RequestMapping("/sentinel1")
    public String sentinel1() {
        // 模拟一次网络延时
        try {
            TimeUnit.SECONDS.sleep(1);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return "sentinel1";
    }

    /**
     * 正常接口，用于观察是否被sentinel1的请求堆积影响
     */
    @RequestMapping("/sentinel2")
    public String sentinel2() {
        return "测试高并发下的问题";
    }

    /**
     * 关联流控模式-读请求（被限流的目标）
     */
    @RequestMapping("/sentinel-read")
    public String readReq() {
        return "读请求";
    }

    /**
     * 关联流控模式-写请求（触发关联的资源）
     */
    @RequestMapping("/sentinel-write")
    public String writeReq() {
        return "写请求";
    }

    /**
     * 链路流控模式-查询订单入口
     */
    @RequestMapping("/queryOrder")
    public String queryOrder() {
        goodService.queryGood();
        return "查询订单";
    }

    /**
     * 链路流控模式-创建订单入口
     */
    @RequestMapping("/createOrder")
    public String createOrder() {
        goodService.queryGood();
        return "创建订单";
    }
}
