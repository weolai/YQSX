package com.gec.shop.product.feign.dto;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * Python DIN 推荐服务 /api/recommend/topk 响应 DTO
 * <p>
 * Python 端统一返回包装结构：{@code {code, msg, data}}，真正业务字段在 data 内。
 */
@Data
public class DinTopKResponseDto implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 业务状态码（200 表示成功）
     */
    private Integer code;

    /**
     * 业务提示信息
     */
    private String msg;

    /**
     * 业务数据体
     */
    private DinTopKData data;

    /**
     * 推荐结果业务字段（对应 Python 返回 data 节点）
     */
    @Data
    public static class DinTopKData implements Serializable {

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
}
