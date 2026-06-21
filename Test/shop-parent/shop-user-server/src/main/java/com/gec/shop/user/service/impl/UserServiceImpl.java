package com.gec.shop.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.user.mapper.UserMapper;
import com.gec.shop.user.pojo.User;
import com.gec.shop.user.service.UserService;
import com.gec.shop.user.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public User findByUsername(String username) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", username);
        return userMapper.selectOne(wrapper);
    }

    @Override
    public boolean validatePassword(String rawPassword, String encodedPassword) {
        return PasswordUtil.matches(rawPassword, encodedPassword);
    }

    @Override
    public boolean register(String username, String password, String nickname) {
        if (findByUsername(username) != null) {
            return false;
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(PasswordUtil.encode(password));
        user.setNickname(nickname == null ? "" : nickname);
        user.setStatus(1);
        return userMapper.insert(user) > 0;
    }
}
