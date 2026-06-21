package com.gec.shop.order.feign;

import com.gec.shop.product.pojo.Product;
import org.springframework.stereotype.Component;

/**
 * Feign远程调用的容错类（降级兜底）
 * 当商品服务不可用时，Sentinel会自动调用此类中的方法返回兜底数据
 * 需要实现对应的Feign客户端接口
 */
@Component
public class ProductFeignFallBack implements IProductFeignService {

    @Override
    public Product get(Long pid) {
        Product product = new Product();
        product.setId(-1L);
        product.setName("兜底数据-商品服务暂时不可用");
        product.setPrice(0.0);
        return product;
    }
}
