package com.gec.shop.order.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一返回结果数据类
 * 用于Sentinel自定义异常返回时的响应数据封装
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResultData {
    private int code;
    private String message;
}
