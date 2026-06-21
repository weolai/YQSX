package com.gec.shop.product.pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 商品实体类
 */
@Data
@TableName("t_product")
public class Product implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Double price;
    private Integer stock;
    private Long categoryId;
    private String imageUrl;
    private Integer sales;
    @TableField(exist = false)
    private String categoryName;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
