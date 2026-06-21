package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * 识别图片尺寸
 */
@Data
public class ImageDimensionsDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer width;
    private Integer height;
}
