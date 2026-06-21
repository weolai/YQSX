package com.gec.shop.order.feign;

import com.gec.shop.order.pojo.User;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "shop-user-service")
public interface IUserFeignService {

    @GetMapping("/users/{uid}")
    User get(@PathVariable("uid") Long uid);
}