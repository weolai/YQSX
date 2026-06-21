package com.gec.shop.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

/**
 * 链路追踪调试配置
 * full-chain 模式下强制走完整调用链（跳过幂等缓存），用于测试/压测场景
 * 生产环境必须设为 false，保持幂等语义
 * @RefreshScope 支持 Nacos Config 动态刷新
 */
@Component
@RefreshScope
public class TraceConfig {

    @Value("${app.trace.full-chain:false}")
    private boolean fullChain;

    public boolean isFullChain() {
        return fullChain;
    }
}
