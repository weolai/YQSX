package com.gec.shop.user.handler;

import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.user.dto.LoginDTO;
import com.gec.shop.user.dto.RegisterDTO;
import com.gec.shop.user.dto.ResetPasswordDTO;
import com.gec.shop.user.dto.SendCodeDTO;
import com.gec.shop.common.util.ResultBuilder;

import java.util.Map;

/**
 * Sentinel 限流降级统一处理器
 * 所有 blockHandler 集中管理，避免控制器膨胀。
 * 方法必须为 static，签名与原接口方法一致（参数列表 + BlockException）。
 */
public class UserBlockHandler {

    public static Map<String, Object> loginBlockHandler(LoginDTO loginDTO, BlockException e) {
        return ResultBuilder.block("登录通道繁忙，请稍后再试");
    }

    public static Map<String, Object> sendCodeBlockHandler(SendCodeDTO sendCodeDTO, BlockException e) {
        return ResultBuilder.block("发送验证码通道繁忙，请稍后再试");
    }

    public static Map<String, Object> registerBlockHandler(RegisterDTO registerDTO, BlockException e) {
        return ResultBuilder.block("注册通道繁忙，请稍后再试");
    }

    public static Map<String, Object> resetPasswordBlockHandler(ResetPasswordDTO resetPasswordDTO, BlockException e) {
        return ResultBuilder.block("重置密码通道繁忙，请稍后再试");
    }
}
