package com.gec.shop.order.feign;

import com.gec.shop.order.pojo.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 用户服务Feign降级兜底
 * 当用户服务不可用时返回兜底数据，避免订单创建流程中断
 */
@Slf4j
@Component
public class UserFeignFallBack implements IUserFeignService {

    @Override
    public User get(Long uid, String internalCall) {
        log.warn("用户服务不可用，返回兜底用户数据: uid={}", uid);
        User user = new User();
        user.setId(uid);
        user.setUsername("user_" + uid);
        user.setNickname("用户" + uid);
        return user;
    }
}
