package com.gec.shop.order.ribbon;

import com.alibaba.cloud.nacos.ribbon.NacosServer;
import com.netflix.client.config.IClientConfig;
import com.netflix.loadbalancer.AbstractLoadBalancerRule;
import com.netflix.loadbalancer.Server;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

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

        List<Server> priorityServers = reachableServers.stream()
                .filter(server -> server instanceof NacosServer)
                .filter(server -> PRIORITY_VERSION.equals(((NacosServer) server).getMetadata().get(VERSION_KEY)))
                .collect(Collectors.toList());

        List<Server> targetServers = priorityServers.isEmpty() ? reachableServers : priorityServers;

        int index = nextIndex.getAndIncrement() % targetServers.size();
        Server chosen = targetServers.get(index);

        if (chosen instanceof NacosServer) {
            NacosServer nacosServer = (NacosServer) chosen;
            log.info("Ribbon 选择实例: {}:{}, metadata: {}",
                    nacosServer.getHost(), nacosServer.getPort(), nacosServer.getMetadata());
        } else {
            log.info("Ribbon 选择实例: {}", chosen.getHostPort());
        }

        return chosen;
    }
}
