package com.gec.shop.order.dto;

import java.io.Serializable;

/**
 * 订单创建请求体
 */
public class OrderCreateDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long pid;
    private Long uid;
    /**
     * 购买数量，默认1
     */
    private Integer number = 1;

    public OrderCreateDTO() {
    }

    public Long getPid() {
        return pid;
    }

    public void setPid(Long pid) {
        this.pid = pid;
    }

    public Long getUid() {
        return uid;
    }

    public void setUid(Long uid) {
        this.uid = uid;
    }

    public Integer getNumber() {
        return number;
    }

    public void setNumber(Integer number) {
        this.number = number;
    }
}
