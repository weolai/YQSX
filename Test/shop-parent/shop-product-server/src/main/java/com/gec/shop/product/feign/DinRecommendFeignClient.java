package com.gec.shop.product.feign;

import com.gec.shop.product.feign.dto.DinTopKResponseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * DIN 推荐服务 Feign 客户端
 * <p>
 * Python 推荐服务独立部署，未注册到 Nacos，因此使用 url 直接指定地址。
 */
@FeignClient(name = "din-recommend-service",
        url = "${din.recommend.url:http://127.0.0.1:8000}",
        fallback = DinRecommendFeignFallback.class)
public interface DinRecommendFeignClient {

    /**
     * 获取用户 TopK 推荐结果
     *
     * @param userId 用户 ID
     * @param k      推荐数量，建议 ≤ 40
     * @return 推荐结果
     */
    @GetMapping("/api/recommend/topk")
    DinTopKResponseDto getTopKRecommendations(@RequestParam("userId") Long userId,
                                              @RequestParam("k") Integer k);
}
