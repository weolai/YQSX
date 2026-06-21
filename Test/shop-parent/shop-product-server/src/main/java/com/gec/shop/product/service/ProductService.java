package com.gec.shop.product.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.gec.shop.product.pojo.Product;
import com.gec.shop.product.vo.RecognitionResponseVo;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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
     * 查询商品列表，支持按类别筛选
     */
    List<Product> listProducts(Long categoryId);
}
