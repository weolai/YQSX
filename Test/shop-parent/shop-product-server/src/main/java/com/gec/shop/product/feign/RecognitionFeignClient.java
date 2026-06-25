package com.gec.shop.product.feign;

import com.gec.shop.product.config.FeignConfig;
import com.gec.shop.product.feign.dto.RecognitionResultDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

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
}
