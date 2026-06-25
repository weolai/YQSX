package com.gec.shop.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gec.shop.user.pojo.SmsCode;
import org.apache.ibatis.annotations.Mapper;

/**
 * 短信验证码 Mapper
 */
@Mapper
public interface SmsCodeMapper extends BaseMapper<SmsCode> {
}
