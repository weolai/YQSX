package com.gec.shop.product.pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 商品类别实体类
 */
@Data
@TableName("t_product_category")
public class ProductCategory implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String displayName;
    private Integer yoloClassId;
    private String description;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
