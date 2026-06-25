package com.gec.shop.order.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.order.feign.IProductFeignService;
import com.gec.shop.order.service.OrderService;
import com.gec.shop.common.util.RedisLockUtil;
import com.gec.shop.product.pojo.Product;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 订单测试接口
 * 仅在 dev/test profile 下加载，生产环境不暴露
 * 启动时通过 -Dspring.profiles.active=dev 启用
 */
@Profile({"dev", "test"})
@RestController
@RequestMapping("/orders")
public class OrderTestController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private RedisLockUtil redisLockUtil;

    @Autowired
    private IProductFeignService productFeignService;

    @GetMapping("/test-product/{pid}")
    public Product testProduct(@PathVariable Long pid) {
        return productFeignService.get(pid);
    }

    @GetMapping("/test-create/{pid}/{uid}")
    public Order testCreate(@PathVariable Long pid, @PathVariable Long uid) {
        return orderService.createOrder(pid, uid, 1);
    }

    @GetMapping("/test-save/{pid}/{uid}")
    @SentinelResource(value = "order.testSave", blockHandler = "testSaveBlockHandler")
    public Order testSave(@PathVariable Long pid, @PathVariable Long uid) {
        String lockKey = "order:dedup:" + uid + ":" + pid;
        String lockValue = Thread.currentThread().getId() + "-" + System.nanoTime();
        boolean locked = redisLockUtil.tryLock(lockKey, lockValue, 10);
        if (!locked) {
            Order order = new Order();
            order.setId(-1L);
            order.setStatus("DUPLICATE");
            return order;
        }
        try {
            return orderService.createOrder(pid, uid, 1);
        } finally {
            redisLockUtil.unlock(lockKey, lockValue);
        }
    }

    public Order testSaveBlockHandler(Long pid, Long uid, BlockException e) {
        Order order = new Order();
        order.setId(-1L);
        order.setStatus("BLOCKED");
        order.setProductName("test-save 限流");
        return order;
    }
}
