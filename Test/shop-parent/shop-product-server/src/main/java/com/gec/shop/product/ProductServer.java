package com.gec.shop.product;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@MapperScan("com.gec.shop.product.mapper")
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "com.gec.shop.product.feign")
public class ProductServer {
    public static void main(String[] args) {
        SpringApplication.run(ProductServer.class, args);
    }
}
