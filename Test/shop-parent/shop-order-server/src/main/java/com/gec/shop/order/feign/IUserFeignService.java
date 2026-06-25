package com.gec.shop.order.feign;

import com.gec.shop.order.pojo.User;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * 用户服务Feign客户端
 * 用于订单服务查询用户信息（如用户名）
 */
@FeignClient(name = "shop-user-service", fallback = UserFeignFallBack.class)
public interface IUserFeignService {

    /**
     * 根据用户ID查询用户信息（内部调用）
     * @param uid 用户ID
     * @param internalCall 内部调用标识（固定值 "true"）
     * @return 用户信息，包含id、username、nickname
     */
    @GetMapping("/user/internal/{id}")
    User get(@PathVariable("id") Long uid,
             @RequestHeader("X-Internal-Call") String internalCall);
}
