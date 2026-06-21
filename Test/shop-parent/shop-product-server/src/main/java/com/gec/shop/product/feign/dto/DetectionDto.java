package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * 识别结果中的单个目标检测项
 */
@Data
public class DetectionDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer productClassId;
    private String productClassName;
    private Double confidence;
    private BoundingBoxDto boundingBox;
}
