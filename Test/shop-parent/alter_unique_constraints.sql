-- ============================================================
-- 批次4-4 & 4-5: 订单号和交易流水号唯一约束迁移脚本
-- 问题：t_order缺少业务订单号order_no，t_payment.transaction_no允许重复
-- 修复：新增order_no字段并添加唯一索引，transaction_no添加唯一索引
-- ============================================================

-- 1. 订单表新增 order_no 字段（业务唯一标识）
ALTER TABLE `shop-order`.`t_order`
  ADD COLUMN `order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单号（业务唯一标识）' AFTER `id`,
  ADD COLUMN `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  ADD COLUMN `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- 2. 为存量订单生成 order_no（使用 id 补齐，避免唯一索引冲突）
UPDATE `shop-order`.`t_order` SET `order_no` = CONCAT('LEGACY', LPAD(id, 10, '0')) WHERE order_no = '';

-- 3. 添加 order_no 唯一索引
ALTER TABLE `shop-order`.`t_order`
  ADD UNIQUE KEY `uk_order_no` (`order_no`);

-- 4. 支付表 transaction_no 改为 NOT NULL 并添加唯一索引
-- 注意：若存在空值，先填充历史数据
UPDATE `shop-payment`.`t_payment` SET `transaction_no` = CONCAT('LEGACY_PAY', LPAD(id, 10, '0')) WHERE transaction_no = '' OR transaction_no IS NULL;

ALTER TABLE `shop-payment`.`t_payment`
  MODIFY COLUMN `transaction_no` VARCHAR(64) NOT NULL COMMENT '第三方交易流水号',
  ADD UNIQUE KEY `uk_transaction_no` (`transaction_no`);

-- 5. 验证迁移结果
SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM information_schema.STATISTICS
WHERE (TABLE_SCHEMA = 'shop-order' AND TABLE_NAME = 't_order' AND INDEX_NAME = 'uk_order_no')
   OR (TABLE_SCHEMA = 'shop-payment' AND TABLE_NAME = 't_payment' AND INDEX_NAME = 'uk_transaction_no')
ORDER BY TABLE_SCHEMA, TABLE_NAME, SEQ_IN_INDEX;
