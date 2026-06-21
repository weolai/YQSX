package com.gec.shop.order.pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.io.Serializable;

/**
 * 订单实体类
 */
@Data
@TableName("t_order")
public class Order implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long uid;
    private String username;
    private Long pid;
    private String productName;
    private Double productPrice;
    private Integer number;
    private String status;
    @Version
    private Integer version;
}
