package com.gec.shop.gateway.handler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
@Order(-2)
public class GlobalExceptionHandler implements ErrorWebExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String path = exchange.getRequest().getPath().value();
        String message;
        HttpStatus status;

        Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
        String causeMsg = cause.getMessage() != null ? cause.getMessage().toLowerCase() : "";

        if (causeMsg.contains("refused") || causeMsg.contains("unavailable") || causeMsg.contains("connection")) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = "下游服务暂时不可用，请稍后重试";
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "系统繁忙，请稍后重试";
        }

        log.warn("Gateway 异常: path={}, ex={}", path, ex.getMessage());

        response.setStatusCode(status);
        String body = String.format("{\"code\":%d,\"msg\":\"%s\",\"path\":\"%s\"}", status.value(), message, path);
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
