package com.gec.shop.product.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gec.shop.product.pojo.ProductCategory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 商品类别 Mapper
 */
@Mapper
public interface ProductCategoryMapper extends BaseMapper<ProductCategory> {

    /**
     * 根据 YOLO class_id 查询类别
     */
    @Select("SELECT * FROM t_product_category WHERE yolo_class_id = #{yoloClassId} AND status = 1 LIMIT 1")
    ProductCategory findByYoloClassId(@Param("yoloClassId") Integer yoloClassId);
}
