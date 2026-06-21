package com.gec.shop.user;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
@MapperScan("com.gec.shop.user.mapper")
public class UserServer {
    public static void main(String[] args) {
        SpringApplication.run(UserServer.class, args);
    }
}
