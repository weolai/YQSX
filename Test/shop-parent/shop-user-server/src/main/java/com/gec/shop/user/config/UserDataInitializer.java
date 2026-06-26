package com.gec.shop.user.config;

import com.gec.shop.user.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 默认管理员账号初始化器
 *
 * 安全约束:
 * - 仅 dev/test profile 下生效,用于本地演示与集成测试
 * - prod profile 下本 Bean 不注册,不创建任何默认账号
 * - 生产环境管理员账号应由 DBA 手动创建(参见 docs/database.md)
 */
@Slf4j
@Profile({"dev", "test"})
@Component
public class UserDataInitializer implements CommandLineRunner {

    @Autowired
    private UserService userService;

    @Override
    public void run(String... args) {
        // 初始化默认测试账号，若已存在则忽略
        try {
            userService.register("admin", "123456", "管理员");
            log.info("[dev/test] 默认测试账号 admin 已初始化");
        } catch (RuntimeException e) {
            // 账号已存在时 register 会抛异常,忽略
            log.info("[dev/test] 默认测试账号已存在,跳过初始化");
        }
    }
}
