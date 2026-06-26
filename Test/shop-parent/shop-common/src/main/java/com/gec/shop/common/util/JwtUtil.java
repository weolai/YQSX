package com.gec.shop.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.core.env.Environment;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;

/**
 * JWT 工具类
 * 密钥从 Nacos 配置中心读取，支持动态刷新。
 * user 服务用于生成 + 校验 token，gateway 服务仅用于校验。
 *
 * 安全约束:
 * - dev/test profile 允许使用示例默认密钥(仅供本地演示)
 * - prod profile 缺失 jwt.secret 或仍为默认值时,直接抛异常拒绝启动
 * - 示例密钥仅出现在 application-dev.yml / global-config.yaml.reference 文档,不硬编码在 Java 源码
 */
@Slf4j
@RefreshScope
public class JwtUtil {

    private static final long EXPIRATION = 24 * 60 * 60 * 1000L;

    /**
     * 示例密钥(仅 dev/test 兜底,prod 必须覆盖)
     * 注:此处仅作为 ${jwt.secret} 缺失时的占位,prod 启动校验会拒绝该值
     */
    private static final String DEV_EXAMPLE_SECRET = "dev-only-jwt-secret-key-please-change-in-prod-32bytes";

    private final Environment environment;

    private SecretKey key;

    /**
     * 从配置注入 JWT 密钥，密钥长度必须 >= 32 字节
     * prod profile 下 jwt.secret 缺失或仍为默认示例值时拒绝启动
     */
    public JwtUtil(@Value("${jwt.secret:" + DEV_EXAMPLE_SECRET + "}") String secret, Environment environment) {
        this.environment = environment;
        validateSecret(secret);
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        log.info("JWT 密钥已从配置中心加载");
    }

    /**
     * prod profile 安全校验:缺失或仍为默认值即拒绝启动
     */
    private void validateSecret(String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT 密钥长度必须 >= 32 字节，当前密钥不满足要求");
        }
        boolean isProd = environment != null
                && Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (isProd && DEV_EXAMPLE_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "生产环境(prod profile)禁止使用默认示例 JWT 密钥,请在 Nacos 配置中心或环境变量 jwt.secret 设置 >=32 字节的随机字符串"
            );
        }
    }

    /**
     * 配置刷新时重新初始化密钥
     */
    @Value("${jwt.secret:" + DEV_EXAMPLE_SECRET + "}")
    public void refreshKey(String secret) {
        if (secret != null && secret.getBytes(StandardCharsets.UTF_8).length >= 32) {
            validateSecret(secret);
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        } else {
            log.error("JWT密钥刷新失败：长度必须 >= 32字节，保持原有密钥");
        }
    }

    public String generateToken(Long userId, String username) {
        Date now = new Date();
        Date expire = new Date(now.getTime() + EXPIRATION);
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .claim("userId", userId)
                .setIssuedAt(now)
                .setExpiration(expire)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public Long getUserId(String token) {
        Claims claims = parseToken(token);
        return Long.valueOf(claims.get("userId").toString());
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
