package com.gec.shop.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gec.shop.product.pojo.Product;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

public interface ProductMapper extends BaseMapper<Product> {

    /**
     * 原子扣减库存并增加销量
     * 使用 WHERE stock >= number 防止超卖
     *
     * @param pid    商品ID
     * @param number 扣减数量
     * @return 受影响行数，0表示库存不足
     */
    @Update("UPDATE t_product SET stock = stock - #{number}, sales = sales + #{number} " +
            "WHERE id = #{pid} AND stock >= #{number}")
    int reduceStock(@Param("pid") Long pid, @Param("number") Integer number);

    /**
     * 补偿回滚库存（订单创建失败时调用）
     *
     * @param pid    商品ID
     * @param number 回滚数量
     * @return 受影响行数
     */
    @Update("UPDATE t_product SET stock = stock + #{number}, sales = sales - #{number} " +
            "WHERE id = #{pid}")
    int rollbackStock(@Param("pid") Long pid, @Param("number") Integer number);
}
