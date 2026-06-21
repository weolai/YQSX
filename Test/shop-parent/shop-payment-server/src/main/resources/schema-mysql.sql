CREATE TABLE IF NOT EXISTS shop_payment.t_payment (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '支付记录ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    user_id BIGINT DEFAULT NULL COMMENT '用户ID',
    amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    pay_type TINYINT NOT NULL DEFAULT 1 COMMENT '支付方式：1-余额，2-微信，3-支付宝',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '支付状态：1-成功，2-失败，3-处理中',
    transaction_no VARCHAR(64) DEFAULT '' COMMENT '第三方交易流水号',
    pay_time DATETIME DEFAULT NULL COMMENT '支付完成时间',
    remark VARCHAR(500) DEFAULT '' COMMENT '备注',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';
