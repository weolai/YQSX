package com.gec.shop.gateway.controller;

import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * DiscoveryClient 手动服务发现演示接口。
 */
@RestController
@RequestMapping("/api/discovery")
public class DiscoveryController {

    private final DiscoveryClient discoveryClient;

    public DiscoveryController(DiscoveryClient discoveryClient) {
        this.discoveryClient = discoveryClient;
    }

    /**
     * 获取 Nacos 中注册的所有服务名。
     */
    @GetMapping("/services")
    public List<String> services() {
        return discoveryClient.getServices();
    }

    /**
     * 获取指定服务的实例列表（含 IP、端口、元数据）。
     */
    @GetMapping("/instances/{serviceId}")
    public List<Map<String, Object>> instances(@PathVariable String serviceId) {
        List<ServiceInstance> instances = discoveryClient.getInstances(serviceId);
        return instances.stream().map(instance -> {
            Map<String, Object> map = new HashMap<>();
            map.put("serviceId", instance.getServiceId());
            map.put("host", instance.getHost());
            map.put("port", instance.getPort());
            map.put("uri", instance.getUri().toString());
            map.put("secure", instance.isSecure());
            map.put("metadata", instance.getMetadata());
            map.put("scheme", instance.getScheme());
            return map;
        }).collect(Collectors.toList());
    }
}
