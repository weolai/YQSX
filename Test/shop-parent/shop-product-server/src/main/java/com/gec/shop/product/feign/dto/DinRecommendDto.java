package com.gec.shop.product.feign.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * DIN 推荐服务返回结果 DTO
 */
@Data
public class DinRecommendDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer code;
    private String msg;
    private List<DinRecommendItem> data;

    /**
     * 样本用户列表响应
     */
    private List<Integer> users;

    @Data
    public static class DinRecommendItem implements Serializable {
        private static final long serialVersionUID = 1L;

        @JsonProperty("item_id")
        private Long itemId;
        @JsonProperty("item_category")
        private Long itemCategory;
        private Double score;
        @JsonProperty("pv_count")
        private Integer pvCount;
        @JsonProperty("cart_count")
        private Integer cartCount;
        @JsonProperty("fav_count")
        private Integer favCount;
        @JsonProperty("buy_count")
        private Integer buyCount;
    }
}
