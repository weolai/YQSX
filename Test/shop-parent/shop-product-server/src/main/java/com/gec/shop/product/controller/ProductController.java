package com.gec.shop.product.controller;

import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.gec.shop.product.pojo.Product;
import com.gec.shop.product.service.ProductService;
import com.gec.shop.product.vo.RecognitionResponseVo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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
        product.setPrice(0.0);
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
}
