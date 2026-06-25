-- ============================================================
-- 批次4-6: 修复 update_status_default.sql
-- 问题：长度 VARCHAR(20) 与 init.sql 的 VARCHAR(32) 不一致
-- 修复：统一为 VARCHAR(32)，与 init.sql 保持一致
-- ============================================================

ALTER TABLE `shop-order`.`t_order`
  MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'WAIT_PAY' COMMENT '订单状态';
