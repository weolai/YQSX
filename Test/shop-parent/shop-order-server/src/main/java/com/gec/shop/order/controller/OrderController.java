package com.gec.shop.order.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.order.dto.OrderCreateDTO;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.order.config.TraceConfig;
import com.gec.shop.order.service.OrderService;
import com.gec.shop.common.util.RedisLockUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private RedisLockUtil redisLockUtil;

    @Autowired
    private TraceConfig traceConfig;

    @PostMapping("/save")
    @SentinelResource(value = "order.create", blockHandler = "createOrderBlockHandler")
    public Order order(@RequestBody OrderCreateDTO dto) {
        String lockKey = "order:dedup:" + dto.getUid() + ":" + dto.getPid();
        String lockValue = Thread.currentThread().getId() + "-" + System.nanoTime();

        boolean locked = redisLockUtil.tryLock(lockKey, lockValue, 10);
        if (!locked) {
            Order order = new Order();
            order.setId(-1L);
            order.setUid(dto.getUid());
            order.setPid(dto.getPid());
            order.setStatus("DUPLICATE");
            order.setProductName("duplicate order request is processing");
            return order;
        }

        try {
            if (!traceConfig.isFullChain()) {
                Order existOrder = orderService.findPendingOrder(dto.getUid(), dto.getPid());
                if (existOrder != null) {
                    return existOrder;
                }
            }
            return orderService.createOrder(dto.getPid(), dto.getUid(), dto.getNumber());
        } finally {
            redisLockUtil.unlock(lockKey, lockValue);
        }
    }

    @GetMapping("/{id}")
    @SentinelResource(value = "order.getById", blockHandler = "getByIdBlockHandler")
    public Order getById(@PathVariable Long id) {
        return orderService.findById(id);
    }

    @GetMapping("/list/{uid}")
    @SentinelResource(value = "order.list", blockHandler = "listBlockHandler")
    public List<Order> listByUid(@PathVariable Long uid) {
        return orderService.findByUid(uid);
    }

    @PostMapping("/updateStatus")
    @SentinelResource(value = "order.updateStatus", blockHandler = "updateStatusBlockHandler")
    public String updateStatus(@RequestParam Long id,
                               @RequestParam String status,
                               @RequestHeader(value = "X-Internal-Call", required = false) String internalCall,
                               @RequestHeader(value = "X-User-Id", required = false) String userId) {
        // 授权校验：仅允许内部服务调用（如支付服务回调）
        // 外部请求不允许直接修改订单状态，防止绕过支付
        if (!"true".equals(internalCall)) {
            throw new RuntimeException("无权限修改订单状态，该接口仅限内部服务调用");
        }
        int rows = orderService.updateStatus(id, status);
        return rows > 0 ? "success" : "fail";
    }

    public Order createOrderBlockHandler(OrderCreateDTO dto, BlockException e) {
        Order order = new Order();
        order.setId(-1L);
        order.setUid(dto.getUid());
        order.setPid(dto.getPid());
        order.setStatus("BLOCKED");
        order.setProductName("当前下单人数过多，请稍后再试");
        return order;
    }

    public Order getByIdBlockHandler(Long id, BlockException e) {
        Order order = new Order();
        order.setId(-1L);
        order.setStatus("BLOCKED");
        order.setProductName("订单查询繁忙，请稍后再试");
        return order;
    }

    public List<Order> listBlockHandler(Long uid, BlockException e) {
        Order order = new Order();
        order.setId(-1L);
        order.setUid(uid);
        order.setStatus("BLOCKED");
        order.setProductName("订单列表查询繁忙，请稍后再试");
        return java.util.Collections.singletonList(order);
    }

    public String updateStatusBlockHandler(Long id, String status, String internalCall, String userId, BlockException e) {
        return "BLOCKED: 订单状态更新繁忙，请稍后再试";
    }
}
