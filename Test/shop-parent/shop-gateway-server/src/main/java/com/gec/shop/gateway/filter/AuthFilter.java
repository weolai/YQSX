package com.gec.shop.gateway.filter;

import com.gec.shop.gateway.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import brave.Span;
import brave.Tracer;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
@RefreshScope
public class AuthFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AuthFilter.class);
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    @Value("#{'${gateway.auth.whitelist:/api/user/login,/api/user/hello}'.split(',')}")
    private List<String> whitelist;

    @Autowired
    private Tracer tracer;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        if (isWhitelist(path)) {
            return writeTraceId(chain.filter(exchange), exchange);
        }

        String token = extractToken(request);
        if (token == null) {
            log.warn("请求缺少 Token: path={}", path);
            return unauthorized(exchange.getResponse(), "请先登录");
        }

        if (!JwtUtil.validateToken(token)) {
            log.warn("Token 校验失败: path={}", path);
            return unauthorized(exchange.getResponse(), "登录已过期或 Token 无效");
        }

        Long userId = JwtUtil.getUserId(token);
        ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", String.valueOf(userId))
                .build();

        return writeTraceId(chain.filter(exchange.mutate().request(mutatedRequest).build()), exchange);
    }

    private Mono<Void> writeTraceId(Mono<Void> chainMono, ServerWebExchange exchange) {
        exchange.getResponse().beforeCommit(() -> {
            Span span = tracer.currentSpan();
            if (span != null) {
                exchange.getResponse().getHeaders().add("X-Trace-Id", span.context().traceIdString());
            }
            return Mono.empty();
        });
        return chainMono;
    }

    private boolean isWhitelist(String path) {
        if (CollectionUtils.isEmpty(whitelist)) {
            return false;
        }
        for (String pattern : whitelist) {
            if (PATH_MATCHER.match(pattern.trim(), path)) {
                return true;
            }
        }
        return false;
    }

    private String extractToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }

    private Mono<Void> unauthorized(ServerHttpResponse response, String msg) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().set("Content-Type", "application/json;charset=UTF-8");
        String body = String.format("{\"code\":401,\"msg\":\"%s\"}", msg);
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 100;
    }
}
