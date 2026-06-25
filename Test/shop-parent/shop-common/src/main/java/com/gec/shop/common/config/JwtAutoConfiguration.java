package com.gec.shop.common.config;

import com.gec.shop.common.util.JwtUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * JwtUtil 自动配置
 * 仅当 jjwt 在类路径上时生效（user/gateway 服务）。
 * order/payment 无 jjwt 依赖，此配置自动跳过。
 */
@Configuration
@ConditionalOnClass(name = "io.jsonwebtoken.Jwts")
@Import(JwtUtil.class)
public class JwtAutoConfiguration {
}
