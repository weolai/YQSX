package com.gec.shop.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具类
 * 密钥从 Nacos 配置中心读取，支持动态刷新。
 * user 服务用于生成 + 校验 token，gateway 服务仅用于校验。
 */
@Slf4j
@RefreshScope
public class JwtUtil {

    private static final long EXPIRATION = 24 * 60 * 60 * 1000L;

    private SecretKey key;

    /**
     * 从配置注入 JWT 密钥，密钥长度必须 >= 32 字节
     * 默认值仅用于开发环境，必须与网关服务保持一致
     */
    public JwtUtil(@Value("${jwt.secret:dev-only-jwt-secret-key-please-change-in-prod-32bytes}") String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT 密钥长度必须 >= 32 字节，当前密钥不满足要求");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        log.info("JWT 密钥已从配置中心加载");
    }

    /**
     * 配置刷新时重新初始化密钥
     */
    @Value("${jwt.secret:dev-only-jwt-secret-key-please-change-in-prod-32bytes}")
    public void refreshKey(String secret) {
        if (secret != null && secret.getBytes(StandardCharsets.UTF_8).length >= 32) {
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
