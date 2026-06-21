package com.gec.shop.payment.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gec.shop.payment.pojo.Payment;
import org.apache.ibatis.annotations.Mapper;

/**
 * 支付记录 Mapper 接口
 */
@Mapper
public interface PaymentMapper extends BaseMapper<Payment> {
}
