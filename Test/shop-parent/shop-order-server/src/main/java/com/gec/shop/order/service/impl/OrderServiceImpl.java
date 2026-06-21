package com.gec.shop.order.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.gec.shop.order.mapper.OrderMapper;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.order.feign.IProductFeignService;
import com.gec.shop.order.service.OrderService;
import com.gec.shop.product.pojo.Product;
import java.util.List;
import java.util.stream.Collectors;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 订单服务实现类
 * 通过OpenFeign调用商品服务获取商品信息，便于Sleuth链路追踪
 */
@Slf4j
@Service
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {

    @Autowired
    private IProductFeignService productFeignService;

    @Autowired
    private MeterRegistry meterRegistry;

    private Counter orderCreateCounter;

    @Autowired
    public void initCounter() {
        orderCreateCounter = Counter.builder("order_create_total")
                .description("Total number of orders created")
                .register(meterRegistry);
    }

    @Override
    public Order createOrder(Long pid, Long uid) {
        // 使用OpenFeign调用商品服务
        Product product = productFeignService.get(pid);

        if (product == null) {
            throw new RuntimeException("商品不存在: pid=" + pid);
        }

        Order order = new Order();
        order.setPid(pid);
        order.setProductName(product.getName());
        order.setProductPrice(product.getPrice());
        order.setUid(uid);
        order.setUsername("dafei");
        order.setNumber(1);
        order.setStatus("WAIT_PAY");
        order.setVersion(0);

        log.info("创建订单: {}", order);
        super.save(order);
        orderCreateCounter.increment();
        return order;
    }

    @Override
    public Order findById(Long id) {
        Order order = super.getById(id);
        if (order == null) {
            return null;
        }
        // 动态刷新商品名称，避免商品数据更新后订单展示不一致
        try {
            Product product = productFeignService.get(order.getPid());
            if (product != null && product.getName() != null) {
                order.setProductName(product.getName());
            }
        } catch (Exception e) {
            log.warn("订单查询时刷新商品名称失败, orderId={}, pid={}", id, order.getPid(), e);
        }
        return order;
    }

    @Override
    public Order findPendingOrder(Long uid, Long pid) {
        return super.lambdaQuery()
                .eq(Order::getUid, uid)
                .eq(Order::getPid, pid)
                .eq(Order::getStatus, "WAIT_PAY")
                .orderByDesc(Order::getId)
                .last("LIMIT 1")
                .one();
    }

    @Override
    public List<Order> findByUid(Long uid) {
        List<Order> orders = super.lambdaQuery()
                .eq(Order::getUid, uid)
                .orderByDesc(Order::getId)
                .list();
        // 批量刷新商品名称，保持与商品库一致
        return orders.stream()
                .peek(order -> {
                    try {
                        Product product = productFeignService.get(order.getPid());
                        if (product != null && product.getName() != null) {
                            order.setProductName(product.getName());
                        }
                    } catch (Exception e) {
                        log.warn("订单列表刷新商品名称失败, orderId={}, pid={}", order.getId(), order.getPid(), e);
                    }
                })
                .collect(Collectors.toList());
    }

    @Override
    public int updateStatus(Long id, String status) {
        Order order = super.getById(id);
        if (order == null) {
            throw new RuntimeException("订单不存在: id=" + id);
        }
        String current = order.getStatus();
        // 幂等：目标状态与当前状态一致，直接返回成功
        if (current != null && current.equals(status)) {
            log.info("订单状态幂等命中: id={}, status={}", id, status);
            return 1;
        }
        if (!isValidTransition(current, status)) {
            throw new RuntimeException("非法状态转换: " + current + " -> " + status);
        }
        order.setStatus(status);
        boolean success = super.updateById(order);
        log.info("更新订单状态: id={}, {} -> {}, success={}", id, current, status, success);
        return success ? 1 : 0;
    }

    private boolean isValidTransition(String from, String to) {
        if ("WAIT_PAY".equals(from) && "PAID".equals(to)) {
            return true;
        }
        if ("PAID".equals(from) && "FINISHED".equals(to)) {
            return true;
        }
        if ("WAIT_PAY".equals(from) && "CANCELED".equals(to)) {
            return true;
        }
        return false;
    }
}
