package com.gec.shop.order.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.gec.shop.order.pojo.Order;

import java.util.List;

public interface OrderService extends IService<Order> {
    /**
     * 创建订单（含库存扣减）
     *
     * @param pid    商品ID
     * @param uid    用户ID
     * @param number 购买数量
     * @return 创建成功的订单
     * @throws RuntimeException 库存不足或商品不存在时抛出
     */
    Order createOrder(Long pid, Long uid, Integer number);
    Order findById(Long id);
    int updateStatus(Long id, String status);
    Order findPendingOrder(Long uid, Long pid);
    List<Order> findByUid(Long uid);
}
