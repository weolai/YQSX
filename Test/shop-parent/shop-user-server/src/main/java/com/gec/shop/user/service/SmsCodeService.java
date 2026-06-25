package com.gec.shop.user.service;

import com.gec.shop.user.pojo.SmsCode;

import java.util.Map;

/**
 * 短信验证码服务
 */
public interface SmsCodeService {

    /**
     * 发送验证码（含 60 秒限流）
     *
     * @param phone 手机号
     * @param type  用途：REGISTER / RESET_PASSWORD
     * @return 包含提示信息 msg 和验证码 code 的 Map（演示环境直接返回 code 供前端弹窗展示）
     */
    Map<String, String> sendCode(String phone, String type);

    /**
     * 校验验证码（一次性使用，校验成功后标记为已使用）
     *
     * @param phone 手机号
     * @param code  验证码
     * @param type  用途
     * @return 校验是否通过
     */
    boolean verifyCode(String phone, String code, String type);

    /**
     * 根据手机号和用途查询最新未使用且未过期的验证码
     */
    SmsCode getLatestValidCode(String phone, String type);
}