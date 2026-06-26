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
        fallback.setCode(503);
        fallback.setMsg("fallback: DIN service unavailable");
        DinTopKResponseDto.DinTopKData data = new DinTopKResponseDto.DinTopKData();
        data.setUserId(userId);
        data.setItems(null);
        data.setHitCache(false);
        data.setLatencyMs(0L);
        data.setModelVersion("fallback");
        data.setDataVersion("fallback");
        data.setYear(0);
        fallback.setData(data);
        return fallback;
    }
}
