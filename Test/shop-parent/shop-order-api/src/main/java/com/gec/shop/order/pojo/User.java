package com.gec.shop.order.pojo;

import lombok.Data;

import java.io.Serializable;

/**
 * 用户实体类
 */
@Data
public class User implements Serializable {
    private Long id;
    private String username;
}
