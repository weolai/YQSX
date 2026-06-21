package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * 目标检测边界框
 */
@Data
public class BoundingBoxDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer x1;
    private Integer y1;
    private Integer x2;
    private Integer y2;
}
