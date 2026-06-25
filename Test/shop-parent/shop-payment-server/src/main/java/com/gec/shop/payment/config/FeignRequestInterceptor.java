package com.gec.shop.payment.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.stereotype.Component;

/**
 * Feign 请求拦截器
 * 为内部服务间调用注入标识头部，便于下游服务区分内部调用与外部请求
 * 生产环境应配合内部签名机制或 mTLS，此处为基础实现
 */
@Component
public class FeignRequestInterceptor implements RequestInterceptor {

    public static final String INTERNAL_CALL_HEADER = "X-Internal-Call";
    public static final String INTERNAL_CALL_VALUE = "true";

    @Override
    public void apply(RequestTemplate template) {
        template.header(INTERNAL_CALL_HEADER, INTERNAL_CALL_VALUE);
    }
}
