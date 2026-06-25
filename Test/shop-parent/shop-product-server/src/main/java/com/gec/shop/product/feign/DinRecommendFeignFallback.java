package com.gec.shop.product.feign;

import com.gec.shop.product.feign.dto.DinTopKResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * DIN 推荐服务 Feign 降级处理
 */
@Slf4j
@Component
public class DinRecommendFeignFallback implements DinRecommendFeignClient {

    @Override
    public DinTopKResponseDto getTopKRecommendations(Long userId, Integer k) {
        log.warn("DIN 推荐服务不可用，触发降级, userId={}, k={}", userId, k);
        DinTopKResponseDto fallback = new DinTopKResponseDto();
        fallback.setUserId(userId);
        fallback.setItems(null);
        fallback.setHitCache(false);
        fallback.setLatencyMs(0L);
        fallback.setModelVersion("fallback");
        fallback.setDataVersion("fallback");
        fallback.setYear(0);
        return fallback;
    }
}
