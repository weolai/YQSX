-- ============================================================
-- 批次3-4: 金额精度修复迁移脚本
-- 问题：t_order.product_price 使用 double(255,0)，精度为0导致小数被截断
-- 问题：t_product.price 使用 double(10,2)，浮点类型存在精度丢失风险
-- 修复：统一改为 DECIMAL(10,2)
-- ============================================================

-- 1. 修复订单表商品单价（严重：原 double(255,0) 会截断小数）
ALTER TABLE `shop-order`.`t_order`
  MODIFY COLUMN `product_price` DECIMAL(10,2) DEFAULT NULL COMMENT '商品单价';

-- 2. 修复商品表价格
ALTER TABLE `shop-product`.`t_product`
  MODIFY COLUMN `price` DECIMAL(10,2) DEFAULT NULL COMMENT '商品价格';

-- 3. 验证迁移结果
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
FROM information_schema.COLUMNS
WHERE (TABLE_SCHEMA = 'shop-order' AND TABLE_NAME = 't_order' AND COLUMN_NAME = 'product_price')
   OR (TABLE_SCHEMA = 'shop-product' AND TABLE_NAME = 't_product' AND COLUMN_NAME = 'price');
