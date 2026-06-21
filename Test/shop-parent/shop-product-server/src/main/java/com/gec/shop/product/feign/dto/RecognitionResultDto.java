package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * 识别服务返回结果
 */
@Data
public class RecognitionResultDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private String recognitionId;
    private String timestamp;
    private List<DetectionDto> detections;
    private Integer detectedCount;
    private ImageDimensionsDto imageDimensions;
    private String modelVersion;
    private Integer processingTimeMs;

    /**
     * 兼容旧版响应格式
     */
    private String status;
    private String message;
    private String requestId;
    private String modelName;
    private Double inferenceTime;
}
