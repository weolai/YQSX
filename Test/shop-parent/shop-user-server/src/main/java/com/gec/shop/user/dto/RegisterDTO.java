package com.gec.shop.user.dto;

import java.io.Serializable;

/**
 * 用户注册请求参数
 */
public class RegisterDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String phone;
    private String code;
    private String username;
    private String password;
    private String nickname;

    public RegisterDTO() {
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }
}
