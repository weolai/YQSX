package com.gec.shop.product.vo;

import com.gec.shop.product.feign.dto.DetectionDto;
import com.gec.shop.product.feign.dto.ImageDimensionsDto;
import com.gec.shop.product.pojo.Product;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * 拍照识别返回结果
 */
@Data
public class RecognitionResponseVo implements Serializable {
    private static final long serialVersionUID = 1L;

    private String status;
    private String message;
    private String requestId;
    private List<Product> products;
    private List<DetectionDto> detections;
    private Integer detectedCount;
    private String categoryName;
    private ImageDimensionsDto imageDimensions;
}
