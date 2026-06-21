package com.gec.shop.payment.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.payment.pojo.Payment;
import com.gec.shop.payment.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 支付记录 Service 实现类
 */
@Service
public class PaymentServiceImpl implements PaymentService {

    @Autowired
    private PaymentMapper paymentMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean save(Payment payment) {
        return paymentMapper.insert(payment) > 0;
    }

    @Override
    public Payment getByOrderId(Long orderId) {
        QueryWrapper<Payment> wrapper = new QueryWrapper<>();
        wrapper.eq("order_id", orderId);
        wrapper.eq("is_deleted", 0);
        wrapper.orderByDesc("create_time");
        wrapper.last("LIMIT 1");
        return paymentMapper.selectOne(wrapper);
    }
}
