package com.gec.shop.order.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

@Component
public class RedisLockUtil {

    @Autowired
    private StringRedisTemplate redisTemplate;

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
        String script =
                "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                "return redis.call('del', KEYS[1]) " +
                "else return 0 end";
        redisTemplate.execute(
                new DefaultRedisScript<>(script, Long.class),
                Collections.singletonList(key),
                value
        );
    }
}
