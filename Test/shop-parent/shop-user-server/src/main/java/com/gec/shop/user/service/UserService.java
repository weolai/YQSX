package com.gec.shop.user.service;

import com.gec.shop.user.pojo.User;

public interface UserService {

    User findByUsername(String username);

    User findByPhone(String phone);

    User findById(Long id);

    boolean validatePassword(String rawPassword, String encodedPassword);

    boolean register(String username, String password, String nickname);

    User registerByPhone(String phone, String username, String password, String nickname);

    boolean resetPasswordByPhone(String phone, String newPassword);
}
