package com.gec.shop.gateway.filter.factory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Gateway 自定义局部过滤器：
 * 记录请求处理耗时，并在响应头中添加 X-Request-Time。
 */
@Component
public class RequestTimeGatewayFilterFactory extends AbstractGatewayFilterFactory<RequestTimeGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(RequestTimeGatewayFilterFactory.class);
    private static final String REQUEST_TIME_START = "requestTimeStart";
    private static final String HEADER_NAME = "X-Request-Time";

    public RequestTimeGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            exchange.getAttributes().put(REQUEST_TIME_START, System.currentTimeMillis());
            return chain.filter(exchange).then(Mono.fromRunnable(() -> {
                Long startTime = exchange.getAttribute(REQUEST_TIME_START);
                if (startTime != null) {
                    long cost = System.currentTimeMillis() - startTime;
                    ServerHttpResponse response = exchange.getResponse();
                    response.getHeaders().add(HEADER_NAME, cost + " ms");
                    if (config.isWithParams()) {
                        String params = exchange.getRequest().getURI().getQuery();
                        log.info("[RequestTime] path={}, params={}, cost={} ms",
                                exchange.getRequest().getPath(), params, cost);
                    } else {
                        log.info("[RequestTime] path={}, cost={} ms",
                                exchange.getRequest().getPath(), cost);
                    }
                }
            }));
        };
    }

    public static class Config {
        private boolean withParams = false;

        public boolean isWithParams() {
            return withParams;
        }

        public void setWithParams(boolean withParams) {
            this.withParams = withParams;
        }
    }
}
