package com.gec.shop.product.vo;

import com.gec.shop.product.pojo.Product;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

/**
 * DIN TopK 推荐响应 VO
 */
@Data
public class DinRecommendResponseVo implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 用户 ID
     */
    private Long userId;

    /**
     * 推荐商品详情列表
     */
    private List<Product> products;

    /**
     * 是否命中缓存
     */
    private Boolean hitCache;

    /**
     * 推荐接口耗时（毫秒）
     */
    private Long latencyMs;

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
     * 是否触发降级
     */
    private Boolean fallback;

    /**
     * 推荐状态：normal=正常推荐, fallback=后端降级, blocked=Sentinel限流
     */
    private String status;

    /**
     * 推荐理由摘要（用于前端展示和可解释性）
     */
    private String reason;
}
