package com.gec.shop.user.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.gec.shop.user.mapper.UserMapper;
import com.gec.shop.user.pojo.User;
import com.gec.shop.user.service.UserService;
import com.gec.shop.user.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserMapper userMapper;

    public void setUserMapper(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public User findByUsername(String username) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", username);
        return userMapper.selectOne(wrapper);
    }

    @Override
    public User findByPhone(String phone) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("phone", phone);
        return userMapper.selectOne(wrapper);
    }

    @Override
    public User findById(Long id) {
        return userMapper.selectById(id);
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

    @Override
    @Transactional(rollbackFor = Exception.class)
    public User registerByPhone(String phone, String username, String password, String nickname) {
        if (findByPhone(phone) != null) {
            throw new RuntimeException("手机号已被注册");
        }
        if (findByUsername(username) != null) {
            throw new RuntimeException("用户名已存在");
        }
        User user = new User();
        user.setPhone(phone);
        user.setUsername(username);
        user.setPassword(PasswordUtil.encode(password));
        user.setNickname(nickname == null ? "" : nickname);
        user.setStatus(1);
        int rows = userMapper.insert(user);
        return rows > 0 ? user : null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean resetPasswordByPhone(String phone, String newPassword) {
        User user = findByPhone(phone);
        if (user == null) {
            throw new RuntimeException("手机号未注册");
        }
        user.setPassword(PasswordUtil.encode(newPassword));
        return userMapper.updateById(user) > 0;
    }
}
