package com.gec.shop.user.service;

import com.gec.shop.user.pojo.User;

public interface UserService {

    User findByUsername(String username);

    boolean validatePassword(String rawPassword, String encodedPassword);

    boolean register(String username, String password, String nickname);
}
