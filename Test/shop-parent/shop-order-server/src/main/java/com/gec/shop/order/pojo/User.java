package com.gec.shop.order.pojo;

import lombok.Data;

import java.io.Serializable;

/**
 * 用户信息DTO（订单服务内部使用，仅包含必要字段）
 * 用于Feign调用用户服务获取用户信息
 */
@Data
public class User implements Serializable {
    private Long id;
    private String username;
    private String nickname;
}
