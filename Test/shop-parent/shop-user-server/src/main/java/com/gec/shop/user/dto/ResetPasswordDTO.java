package com.gec.shop.user.dto;

import java.io.Serializable;

/**
 * 重置密码请求参数
 */
public class ResetPasswordDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String phone;
    private String code;
    private String newPassword;

    public ResetPasswordDTO() {
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

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
