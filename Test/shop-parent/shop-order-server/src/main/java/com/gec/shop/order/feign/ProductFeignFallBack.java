package com.gec.shop.order.feign;

import com.gec.shop.product.pojo.Product;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Feign远程调用的容错类（降级兜底）
 * 当商品服务不可用时，Sentinel会自动调用此类中的方法返回兜底数据
 * 需要实现对应的Feign客户端接口
 */
@Slf4j
@Component
public class ProductFeignFallBack implements IProductFeignService {

    @Override
    public Product get(Long pid) {
        Product product = new Product();
        product.setId(-1L);
        product.setName("兜底数据-商品服务暂时不可用");
        product.setPrice(BigDecimal.ZERO);
        return product;
    }

    @Override
    public boolean reduceStock(Long pid, Integer number) {
        log.error("扣减库存降级: 商品服务不可用, pid={}, number={}", pid, number);
        return false;
    }

    @Override
    public boolean rollbackStock(Long pid, Integer number) {
        log.error("回滚库存降级: 商品服务不可用, 需人工补偿, pid={}, number={}", pid, number);
        return false;
    }

    @Override
    public Map<Long, String> batchGetProductNames(List<Long> ids) {
        log.warn("批量查询商品名称降级: 商品服务不可用, ids={}", ids);
        return Collections.emptyMap();
    }
}
