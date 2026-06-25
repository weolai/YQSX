package com.gec.shop.user.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.gec.shop.user.dto.LoginDTO;
import com.gec.shop.user.dto.RegisterDTO;
import com.gec.shop.user.dto.ResetPasswordDTO;
import com.gec.shop.user.dto.SendCodeDTO;
import com.gec.shop.user.handler.UserBlockHandler;
import com.gec.shop.user.pojo.User;
import com.gec.shop.user.service.SmsCodeService;
import com.gec.shop.user.service.UserService;
import com.gec.shop.common.util.JwtUtil;
import com.gec.shop.user.util.PhoneUtil;
import com.gec.shop.common.util.ResultBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("user")
public class UserController {

    @Value("${server.port}")
    private String port;

    @Autowired
    private UserService userService;

    @Autowired
    private SmsCodeService smsCodeService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/hello")
    public Map<String, String> hello() {
        Map<String, String> result = new HashMap<>();
        result.put("service", "shop-user-service");
        result.put("port", port);
        result.put("msg", "user service is running");
        return result;
    }

    @GetMapping("/current")
    public Map<String, Object> current(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        Map<String, Object> result = new HashMap<>();
        result.put("service", "shop-user-service");
        result.put("port", port);
        result.put("userId", userId);
        return result;
    }

    /**
     * 内部服务调用：根据用户ID查询用户信息（仅限内部服务调用）
     * 返回脱敏后的用户信息（不含密码）
     */
    @GetMapping("/internal/{id}")
    public Map<String, Object> getByIdInternal(@PathVariable("id") Long id,
                                               @RequestHeader(value = "X-Internal-Call", required = false) String internalCall) {
        if (!"true".equals(internalCall)) {
            return ResultBuilder.error(403, "无权限访问，该接口仅限内部服务调用");
        }
        User user = userService.findById(id);
        if (user == null) {
            return ResultBuilder.error(404, "用户不存在");
        }
        Map<String, Object> result = ResultBuilder.success("success");
        result.put("id", user.getId());
        result.put("username", user.getUsername());
        result.put("nickname", user.getNickname());
        return result;
    }

    @PostMapping("/login")
    @SentinelResource(value = "user.login", blockHandler = "loginBlockHandler",
            blockHandlerClass = UserBlockHandler.class)
    public Map<String, Object> login(@RequestBody LoginDTO loginDTO) {
        User user = userService.findByUsername(loginDTO.getUsername());
        if (user != null && user.getStatus() == 1
                && userService.validatePassword(loginDTO.getPassword(), user.getPassword())) {
            String token = jwtUtil.generateToken(user.getId(), user.getUsername());
            Map<String, Object> result = ResultBuilder.success("login success");
            result.put("userId", user.getId());
            result.put("username", user.getUsername());
            result.put("token", token);
            return result;
        }
        return ResultBuilder.error(401, "login failed");
    }

    /**
     * 发送短信验证码
     */
    @PostMapping("/send-code")
    @SentinelResource(value = "user.send_code", blockHandler = "sendCodeBlockHandler",
            blockHandlerClass = UserBlockHandler.class)
    public Map<String, Object> sendCode(@RequestBody SendCodeDTO sendCodeDTO) {
        try {
            String phone = sendCodeDTO.getPhone();
            String type = sendCodeDTO.getType();
            if (!PhoneUtil.isValid(phone)) {
                return ResultBuilder.error(400, "手机号格式不正确");
            }
            if (!"REGISTER".equals(type) && !"RESET_PASSWORD".equals(type)) {
                return ResultBuilder.error(400, "验证码类型不正确");
            }
            Map<String, String> sendResult = smsCodeService.sendCode(phone, type);
            Map<String, Object> result = ResultBuilder.success(sendResult.get("msg"));
            result.put("verifyCode", sendResult.get("code"));
            return result;
        } catch (RuntimeException e) {
            return ResultBuilder.error(429, e.getMessage());
        } catch (Exception e) {
            return ResultBuilder.error(500, "验证码发送失败");
        }
    }

    /**
     * 手机号验证码注册
     */
    @PostMapping("/register")
    @SentinelResource(value = "user.register", blockHandler = "registerBlockHandler",
            blockHandlerClass = UserBlockHandler.class)
    public Map<String, Object> register(@RequestBody RegisterDTO registerDTO) {
        try {
            String phone = registerDTO.getPhone();
            String code = registerDTO.getCode();
            String username = registerDTO.getUsername();
            String password = registerDTO.getPassword();

            if (!PhoneUtil.isValid(phone)) {
                return ResultBuilder.error(400, "手机号格式不正确");
            }
            if (username == null || username.trim().isEmpty()) {
                return ResultBuilder.error(400, "用户名不能为空");
            }
            if (password == null || password.length() < 6) {
                return ResultBuilder.error(400, "密码长度不能少于 6 位");
            }
            if (!smsCodeService.verifyCode(phone, code, "REGISTER")) {
                return ResultBuilder.error(400, "验证码错误或已过期");
            }

            User user = userService.registerByPhone(phone, username.trim(), password, registerDTO.getNickname());
            String token = jwtUtil.generateToken(user.getId(), user.getUsername());
            Map<String, Object> result = ResultBuilder.success("注册成功");
            result.put("userId", user.getId());
            result.put("username", user.getUsername());
            result.put("token", token);
            return result;
        } catch (RuntimeException e) {
            return ResultBuilder.error(400, e.getMessage());
        } catch (Exception e) {
            return ResultBuilder.error(500, "注册失败");
        }
    }

    /**
     * 手机号验证码重置密码
     */
    @PostMapping("/reset-password")
    @SentinelResource(value = "user.reset_password", blockHandler = "resetPasswordBlockHandler",
            blockHandlerClass = UserBlockHandler.class)
    public Map<String, Object> resetPassword(@RequestBody ResetPasswordDTO resetPasswordDTO) {
        try {
            String phone = resetPasswordDTO.getPhone();
            String code = resetPasswordDTO.getCode();
            String newPassword = resetPasswordDTO.getNewPassword();

            if (!PhoneUtil.isValid(phone)) {
                return ResultBuilder.error(400, "手机号格式不正确");
            }
            if (newPassword == null || newPassword.length() < 6) {
                return ResultBuilder.error(400, "密码长度不能少于 6 位");
            }
            if (!smsCodeService.verifyCode(phone, code, "RESET_PASSWORD")) {
                return ResultBuilder.error(400, "验证码错误或已过期");
            }

            userService.resetPasswordByPhone(phone, newPassword);
            return ResultBuilder.success("密码重置成功，请使用新密码登录");
        } catch (RuntimeException e) {
            return ResultBuilder.error(400, e.getMessage());
        } catch (Exception e) {
            return ResultBuilder.error(500, "密码重置失败");
        }
    }
}
