package com.gec.shop.order.config;

import com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.RequestOriginParser;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;

/**
 * 请求来源解析器定义
 * 定义从请求的什么地方获取来源信息（origin）
 * 用于Sentinel授权规则的黑白名单判断
 */
@Component
public class RequestOriginParserDefinition implements RequestOriginParser {
    @Override
    public String parseOrigin(HttpServletRequest request) {
        /**
         * 定义从请求的什么地方获取来源信息
         * 比如我们可以要求所有的客户端需要在请求头中携带来源信息
         *
         * 这里为了方便演示，是从URL地址栏获取parameter参数
         */
        String serviceName = request.getParameter("serviceName");
        return serviceName;
    }
}
