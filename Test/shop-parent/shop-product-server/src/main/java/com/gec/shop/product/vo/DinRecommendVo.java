package com.gec.shop.product.vo;

import lombok.Data;

import java.io.Serializable;

/**
 * DIN 推荐结果 VO (返回给前端)
 */
@Data
public class DinRecommendVo implements Serializable {
    private static final long serialVersionUID = 1L;

    /**
     * 天池商品ID
     */
    private Long itemId;

    /**
     * 天池商品类目
     */
    private Long itemCategory;

    /**
     * 展示名称: "类目{X}精选"
     */
    private String displayName;

    /**
     * 展示图片URL (文生图)
     */
    private String displayImage;

    /**
     * DIN 推荐得分 [0, 1]
     */
    private Double score;

    /**
     * 浏览次数
     */
    private Integer pvCount;

    /**
     * 加购次数
     */
    private Integer cartCount;

    /**
     * 收藏次数
     */
    private Integer favCount;

    /**
     * 购买次数
     */
    private Integer buyCount;

    /**
     * 综合热度分 (pv + cart*2 + fav*1.5 + buy*3)
     */
    private Integer popularityScore;
}
