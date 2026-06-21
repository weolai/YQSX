package com.gec.shop.order.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.gec.shop.order.pojo.Order;

import java.util.List;

public interface OrderService extends IService<Order> {
    Order createOrder(Long pid, Long uid);
    Order findById(Long id);
    int updateStatus(Long id, String status);
    Order findPendingOrder(Long uid, Long pid);
    List<Order> findByUid(Long uid);
}
