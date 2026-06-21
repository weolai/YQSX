package com.gec.shop.user.config;

import com.gec.shop.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class UserDataInitializer implements CommandLineRunner {

    @Autowired
    private UserService userService;

    @Override
    public void run(String... args) {
        // 初始化默认测试账号，若已存在则忽略
        userService.register("admin", "123456", "管理员");
    }
}
