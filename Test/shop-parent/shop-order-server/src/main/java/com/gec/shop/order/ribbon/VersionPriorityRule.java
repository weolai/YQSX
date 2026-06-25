package com.gec.shop.order.ribbon;

import com.alibaba.cloud.nacos.ribbon.NacosServer;
import com.netflix.client.config.IClientConfig;
import com.netflix.loadbalancer.AbstractLoadBalancerRule;
import com.netflix.loadbalancer.Server;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 自定义 Ribbon 负载均衡规则：
 * 优先选择 Nacos 元数据中 version=2 的实例；
 * 若不存在，则回退到所有可用实例的轮询策略。
 */
public class VersionPriorityRule extends AbstractLoadBalancerRule {

    private static final Logger log = LoggerFactory.getLogger(VersionPriorityRule.class);
    private static final String VERSION_KEY = "version";
    private static final String PRIORITY_VERSION = "2";

    private final AtomicInteger nextIndex = new AtomicInteger(0);

    @Override
    public void initWithNiwsConfig(IClientConfig clientConfig) {
        // 无需额外配置
    }

    @Override
    public Server choose(Object key) {
        List<Server> reachableServers = getLoadBalancer().getReachableServers();
        if (reachableServers == null || reachableServers.isEmpty()) {
            log.warn("无可用服务实例");
            return null;
        }

        // for 循环替代 Stream，避免每次请求创建中间 pipeline 对象
        List<Server> priorityServers = new ArrayList<>(reachableServers.size());
        for (Server server : reachableServers) {
            if (server instanceof NacosServer) {
                NacosServer nacosServer = (NacosServer) server;
                if (PRIORITY_VERSION.equals(nacosServer.getMetadata().get(VERSION_KEY))) {
                    priorityServers.add(nacosServer);
                }
            }
        }

        List<Server> targetServers = priorityServers.isEmpty() ? reachableServers : priorityServers;

        int index = nextIndex.getAndIncrement() % targetServers.size();
        Server chosen = targetServers.get(index);

        if (chosen instanceof NacosServer) {
            NacosServer nacosServer = (NacosServer) chosen;
            log.debug("Ribbon 选择实例: {}:{}", nacosServer.getHost(), nacosServer.getPort());
        } else {
            log.debug("Ribbon 选择实例: {}", chosen.getHostPort());
        }

        return chosen;
    }
}
