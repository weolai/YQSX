package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;

/**
 * DIN 推荐结果单项 DTO
 */
@Data
public class RecommendationItemDto implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 商品 ID
     */
    private Long itemId;

    /**
     * 模型打分
     */
    private Double score;

    /**
     * 排名（从 1 开始）
     */
    private Integer rank;

    /**
     * 推荐理由
     */
    private String reason;
}
