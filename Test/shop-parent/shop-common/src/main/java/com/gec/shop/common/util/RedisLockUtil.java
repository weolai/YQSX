package com.gec.shop.common.util;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

/**
 * Redis 分布式锁工具类
 * 使用 SET NX EX 加锁 + Lua 脚本原子释放，防止误删他人锁。
 */
public class RedisLockUtil {

    /** 释放锁的 Lua 脚本，提取为常量复用，支持 EVALSHA 优化 */
    private static final DefaultRedisScript<Long> UNLOCK_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "return redis.call('del', KEYS[1]) " +
            "else return 0 end",
            Long.class
    );

    private final StringRedisTemplate redisTemplate;

    public RedisLockUtil(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 尝试获取分布式锁
     *
     * @param key           锁标识
     * @param value         唯一值，释放锁时校验
     * @param expireSeconds 锁过期时间（秒）
     * @return 是否获取成功
     */
    public boolean tryLock(String key, String value, long expireSeconds) {
        Boolean success = redisTemplate.opsForValue()
                .setIfAbsent(key, value, expireSeconds, TimeUnit.SECONDS);
        return Boolean.TRUE.equals(success);
    }

    /**
     * 释放锁，使用 Lua 脚本保证原子性
     */
    public void unlock(String key, String value) {
        redisTemplate.execute(
                UNLOCK_SCRIPT,
                Collections.singletonList(key),
                value
        );
    }
}
