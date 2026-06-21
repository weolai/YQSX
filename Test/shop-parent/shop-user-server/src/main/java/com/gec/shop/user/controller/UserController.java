package com.gec.shop.user.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.user.dto.LoginDTO;
import com.gec.shop.user.pojo.User;
import com.gec.shop.user.service.UserService;
import com.gec.shop.user.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
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

    @PostMapping("/login")
    @SentinelResource(value = "user.login", blockHandler = "loginBlockHandler")
    public Map<String, Object> login(@RequestBody LoginDTO loginDTO) {
        Map<String, Object> result = new HashMap<>();
        User user = userService.findByUsername(loginDTO.getUsername());
        if (user != null && user.getStatus() == 1
                && userService.validatePassword(loginDTO.getPassword(), user.getPassword())) {
            String token = JwtUtil.generateToken(user.getId(), user.getUsername());
            result.put("code", 200);
            result.put("msg", "login success");
            result.put("userId", user.getId());
            result.put("username", user.getUsername());
            result.put("token", token);
        } else {
            result.put("code", 401);
            result.put("msg", "login failed");
        }
        return result;
    }

    public Map<String, Object> loginBlockHandler(LoginDTO loginDTO, BlockException e) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 429);
        result.put("msg", "登录通道繁忙，请稍后再试");
        return result;
    }
}
