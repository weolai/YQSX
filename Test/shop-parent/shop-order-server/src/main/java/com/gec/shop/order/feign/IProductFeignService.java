package com.gec.shop.order.feign;

import com.gec.shop.product.pojo.Product;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "shop-product-service", fallback = ProductFeignFallBack.class)
public interface IProductFeignService {

    @GetMapping("/products/{pid}")
    Product get(@PathVariable("pid") Long pid);

    /**
     * 批量查询商品名称（解决 N+1 问题）
     *
     * @param ids 商品ID列表
     * @return Map&lt;商品ID, 商品名称&gt;
     */
    @GetMapping("/products/batchNames")
    Map<Long, String> batchGetProductNames(@RequestParam("ids") List<Long> ids);

    /**
     * 原子扣减库存
     *
     * @param pid    商品ID
     * @param number 扣减数量
     * @return true=成功，false=库存不足或被限流
     */
    @PostMapping("/products/reduceStock")
    boolean reduceStock(@RequestParam("pid") Long pid, @RequestParam("number") Integer number);

    /**
     * 补偿回滚库存
     *
     * @param pid    商品ID
     * @param number 回滚数量
     * @return true=成功
     */
    @PostMapping("/products/rollbackStock")
    boolean rollbackStock(@RequestParam("pid") Long pid, @RequestParam("number") Integer number);
}
