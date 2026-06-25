package com.gec.shop.common.config;

import com.gec.shop.common.util.RedisLockUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * RedisLockUtil 自动配置
 * 仅当 StringRedisTemplate 在类路径上时生效（order/payment 服务）。
 * gateway 无 spring-data-redis 依赖，此配置自动跳过。
 */
@Configuration
@ConditionalOnClass(StringRedisTemplate.class)
public class RedisLockAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public RedisLockUtil redisLockUtil(StringRedisTemplate redisTemplate) {
        return new RedisLockUtil(redisTemplate);
    }
}
