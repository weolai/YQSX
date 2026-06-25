package com.gec.shop.product.feign;

import com.gec.shop.product.config.FeignConfig;
import com.gec.shop.product.feign.dto.DinRecommendDto;
import com.gec.shop.product.feign.dto.RecognitionResultDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 识别服务 Feign 客户端
 */
@FeignClient(name = "shop-recognition-service", fallback = RecognitionFeignFallback.class, configuration = FeignConfig.class)
public interface RecognitionFeignClient {

    /**
     * 上传图片进行识别
     */
    @PostMapping(value = "/api/recognition/v1/recognize/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    RecognitionResultDto recognizeImage(@RequestPart("file") MultipartFile file);

    /**
     * 基于 DIN 模型的商品推荐
     *
     * @param request 包含 user_id 和 top_k
     * @return 推荐结果列表
     */
    @PostMapping(value = "/api/recommend/v1/din", consumes = MediaType.APPLICATION_JSON_VALUE)
    DinRecommendDto dinRecommend(@RequestBody Map<String, Object> request);

    /**
     * 获取样本用户ID列表 (行为最丰富的用户)
     *
     * @return 样本用户ID列表
     */
    @GetMapping("/api/recommend/v1/users")
    DinRecommendDto getSampleUsers();
}
