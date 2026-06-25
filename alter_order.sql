-- ============================================================
-- 批次4-6: 修复 alter_order.sql 与 init.sql 的冲突
-- 问题：
--   1. alter_order.sql 添加 status 字段，但 init.sql 已定义该字段，重复执行会报错
--   2. 默认值 'CREATED' 与项目状态机不符（应为 'WAIT_PAY'）
--   3. 长度 VARCHAR(20) 与 init.sql 的 VARCHAR(32) 不一致
-- 修复：改为幂等脚本，使用 information_schema 判断字段是否存在
-- ============================================================

-- 1. 幂等添加 status 字段（仅在不存在时添加）
SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'shop-order'
    AND TABLE_NAME = 't_order'
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `shop-order`.`t_order` ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT \'WAIT_PAY\' COMMENT \'订单状态\' AFTER `number`',
  'SELECT \'status column already exists, skipping\' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 统一 status 字段定义（长度、默认值、NOT NULL）
ALTER TABLE `shop-order`.`t_order`
  MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'WAIT_PAY' COMMENT '订单状态';

-- 3. 验证
SELECT id, status FROM `shop-order`.`t_order` LIMIT 5;
