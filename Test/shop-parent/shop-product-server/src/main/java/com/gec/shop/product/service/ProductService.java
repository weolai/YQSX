package com.gec.shop.product.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.gec.shop.product.pojo.Product;
import com.gec.shop.product.vo.DinRecommendResponseVo;
import com.gec.shop.product.vo.RecognitionResponseVo;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface ProductService extends IService<Product> {

    /**
     * 拍照识别商品
     */
    RecognitionResponseVo recognize(MultipartFile file, Long uid);

    /**
     * 基于类别推荐商品
     */
    List<Product> recommendByCategory(Long categoryId, Integer limit);

    /**
     * 基于 DIN 模型获取用户 TopK 推荐
     *
     * @param userId 用户 ID
     * @param k      推荐数量，限制 ≤ 40
     * @return 推荐结果 VO（含商品详情、缓存状态、耗时等）
     */
    DinRecommendResponseVo getDinTopKRecommendations(Long userId, Integer k);

    /**
     * 查询商品列表，支持按类别筛选
     */
    List<Product> listProducts(Long categoryId);

    /**
     * 批量查询商品名称（解决订单列表 N+1 调用问题）
     *
     * @param ids 商品ID列表
     * @return Map&lt;商品ID, 商品名称&gt;
     */
    Map<Long, String> batchGetNames(List<Long> ids);

    /**
     * 原子扣减库存
     *
     * @param pid    商品ID
     * @param number 扣减数量
     * @return true=扣减成功，false=库存不足
     */
    boolean reduceStock(Long pid, Integer number);

    /**
     * 补偿回滚库存（订单创建失败时调用）
     *
     * @param pid    商品ID
     * @param number 回滚数量
     */
    void rollbackStock(Long pid, Integer number);
}
