package com.gec.shop.common.config;

import com.gec.shop.common.handler.UnifiedBlockExceptionHandler;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * Sentinel 统一异常处理器自动配置
 * 仅当 Sentinel WebMVC 适配器在类路径上且应用为 Servlet 类型时生效（order/payment/user 服务）。
 * gateway 使用 WebFlux + Sentinel Gateway 适配器，此配置自动跳过。
 */
@Configuration
@ConditionalOnClass(name = "com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.BlockExceptionHandler")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import(UnifiedBlockExceptionHandler.class)
public class SentinelAutoConfiguration {
}
