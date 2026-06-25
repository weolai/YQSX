package com.gec.shop.product.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.product.pojo.Product;
import com.gec.shop.product.service.ProductService;
import com.gec.shop.product.vo.DinRecommendVo;
import com.gec.shop.product.vo.RecognitionResponseVo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("products")
public class ProductController {
    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    @Autowired
    private ProductService productService;

    @GetMapping("/{pid}")
    @SentinelResource(value = "product.getById", blockHandler = "findByIdBlockHandler")
    public Product findById(@PathVariable Long pid){
        return productService.getById(pid);
    }

    public Product findByIdBlockHandler(Long pid, BlockException e) {
        Product product = new Product();
        product.setId(pid);
        product.setName("商品查询繁忙，请稍后再试");
        product.setPrice(BigDecimal.ZERO);
        return product;
    }

    /**
     * 拍照识别商品
     */
    @PostMapping("/recognize")
    @SentinelResource(value = "product.recognize", blockHandler = "recognizeBlockHandler")
    public RecognitionResponseVo recognize(@RequestParam("file") MultipartFile file,
                                           @RequestParam(value = "uid", required = false) Long uid) {
        log.info("收到拍照识别请求, uid={}, fileName={}", uid, file.getOriginalFilename());
        return productService.recognize(file, uid);
    }

    public RecognitionResponseVo recognizeBlockHandler(MultipartFile file, Long uid, BlockException e) {
        RecognitionResponseVo response = new RecognitionResponseVo();
        response.setStatus("blocked");
        response.setMessage("识别请求过于频繁，请稍后再试");
        return response;
    }

    /**
     * 基于类别推荐商品
     */
    @GetMapping("/recommend")
    @SentinelResource(value = "product.recommend", blockHandler = "recommendBlockHandler")
    public List<Product> recommend(@RequestParam("categoryId") Long categoryId,
                                   @RequestParam(value = "limit", defaultValue = "10") Integer limit) {
        return productService.recommendByCategory(categoryId, limit);
    }

    public List<Product> recommendBlockHandler(Long categoryId, Integer limit, BlockException e) {
        return null;
    }

    /**
     * 基于 DIN 模型的个性化推荐
     * 输入天池用户ID，返回推荐商品列表
     */
    @GetMapping("/recommend/din")
    @SentinelResource(value = "product.recommendDin", blockHandler = "recommendDinBlockHandler")
    public List<DinRecommendVo> recommendByDin(@RequestParam Long userId,
                                                @RequestParam(value = "topK", defaultValue = "10") Integer topK) {
        log.info("收到 DIN 推荐请求, userId={}, topK={}", userId, topK);
        return productService.recommendByDin(userId, topK);
    }

    public List<DinRecommendVo> recommendDinBlockHandler(Long userId, Integer topK, BlockException e) {
        log.warn("DIN 推荐被限流: userId={}, topK={}", userId, topK);
        return Collections.emptyList();
    }

    /**
     * 获取样本用户ID列表 (行为最丰富的用户)
     */
    @GetMapping("/recommend/users")
    @SentinelResource(value = "product.sampleUsers", blockHandler = "sampleUsersBlockHandler")
    public List<Long> getSampleUsers() {
        log.info("收到获取样本用户列表请求");
        return productService.getSampleUserIds();
    }

    public List<Long> sampleUsersBlockHandler(BlockException e) {
        log.warn("获取样本用户被限流");
        return Collections.emptyList();
    }

    /**
     * 商品列表，支持按类别筛选
     */
    @GetMapping("/list")
    @SentinelResource(value = "product.list", blockHandler = "listBlockHandler")
    public List<Product> list(@RequestParam(value = "categoryId", required = false) Long categoryId) {
        return productService.listProducts(categoryId);
    }

    public List<Product> listBlockHandler(Long categoryId, BlockException e) {
        return null;
    }

    /**
     * 批量查询商品名称（订单服务内部调用，解决 N+1 问题）
     */
    @GetMapping("/batchNames")
    public Map<Long, String> batchGetNames(@RequestParam List<Long> ids) {
        return productService.batchGetNames(ids);
    }

    /**
     * 原子扣减库存（订单服务内部调用）
     */
    @PostMapping("/reduceStock")
    @SentinelResource(value = "product.reduceStock", blockHandler = "reduceStockBlockHandler")
    public boolean reduceStock(@RequestParam Long pid, @RequestParam Integer number) {
        return productService.reduceStock(pid, number);
    }

    public boolean reduceStockBlockHandler(Long pid, Integer number, BlockException e) {
        log.warn("库存扣减被限流: pid={}, number={}", pid, number);
        return false;
    }

    /**
     * 补偿回滚库存（订单服务内部调用）
     */
    @PostMapping("/rollbackStock")
    @SentinelResource(value = "product.rollbackStock", blockHandler = "rollbackStockBlockHandler")
    public boolean rollbackStock(@RequestParam Long pid, @RequestParam Integer number) {
        productService.rollbackStock(pid, number);
        return true;
    }

    public boolean rollbackStockBlockHandler(Long pid, Integer number, BlockException e) {
        log.error("库存回滚被限流,需人工补偿: pid={}, number={}", pid, number);
        return false;
    }
}
