package com.gec.shop.order.feign;

import com.gec.shop.product.pojo.Product;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "shop-product-service", fallback = ProductFeignFallBack.class)
public interface IProductFeignService {

    @GetMapping("/products/{pid}")
    Product get(@PathVariable("pid") Long pid);
}
