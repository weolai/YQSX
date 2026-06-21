CREATE TABLE IF NOT EXISTS t_payment (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    user_id BIGINT DEFAULT NULL,
    amount DECIMAL(10,2) NOT NULL,
    pay_type TINYINT NOT NULL DEFAULT 1,
    status TINYINT NOT NULL DEFAULT 1,
    transaction_no VARCHAR(64) DEFAULT '',
    pay_time DATETIME DEFAULT NULL,
    remark VARCHAR(500) DEFAULT '',
    is_deleted TINYINT NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_id ON t_payment(order_id);
CREATE INDEX IF NOT EXISTS idx_status ON t_payment(status);
CREATE INDEX IF NOT EXISTS idx_create_time ON t_payment(create_time);
