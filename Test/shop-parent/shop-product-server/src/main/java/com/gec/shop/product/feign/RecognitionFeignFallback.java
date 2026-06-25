package com.gec.shop.product.feign;

import com.gec.shop.product.feign.dto.DinRecommendDto;
import com.gec.shop.product.feign.dto.RecognitionResultDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.Map;

/**
 * 识别服务 Feign 降级处理
 */
@Slf4j
@Component
public class RecognitionFeignFallback implements RecognitionFeignClient {

    @Override
    public RecognitionResultDto recognizeImage(MultipartFile file) {
        log.warn("识别服务不可用，触发降级");
        RecognitionResultDto result = new RecognitionResultDto();
        result.setStatus("fallback");
        result.setMessage("识别服务暂时不可用，请稍后再试");
        result.setDetections(Collections.emptyList());
        return result;
    }

    @Override
    public DinRecommendDto dinRecommend(Map<String, Object> request) {
        log.warn("DIN 推荐服务不可用，触发降级: {}", request);
        DinRecommendDto result = new DinRecommendDto();
        result.setCode(503);
        result.setMsg("DIN 推荐服务暂时不可用，请稍后再试");
        result.setData(Collections.emptyList());
        return result;
    }

    @Override
    public DinRecommendDto getSampleUsers() {
        log.warn("DIN 推荐服务不可用，获取样本用户触发降级");
        DinRecommendDto result = new DinRecommendDto();
        result.setCode(503);
        result.setMsg("DIN 推荐服务暂时不可用");
        result.setData(Collections.emptyList());
        return result;
    }
}
