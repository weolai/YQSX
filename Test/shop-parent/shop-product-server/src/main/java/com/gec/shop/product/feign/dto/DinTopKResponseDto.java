package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * Python DIN 推荐服务 /api/recommend/topk 响应 DTO
 */
@Data
public class DinTopKResponseDto implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 用户 ID
     */
    private Long userId;

    /**
     * 推荐商品列表
     */
    private List<RecommendationItemDto> items;

    /**
     * 模型版本
     */
    private String modelVersion;

    /**
     * 数据版本
     */
    private String dataVersion;

    /**
     * 数据年份
     */
    private Integer year;

    /**
     * 是否命中缓存
     */
    private Boolean hitCache;

    /**
     * 接口耗时（毫秒）
     */
    private Long latencyMs;
}
