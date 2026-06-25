package com.gec.shop.user.dto;

import java.io.Serializable;

/**
 * 发送验证码请求参数
 */
public class SendCodeDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String phone;
    /**
     * REGISTER / RESET_PASSWORD
     */
    private String type;

    public SendCodeDTO() {
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
