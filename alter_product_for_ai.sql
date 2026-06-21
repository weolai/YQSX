-- ============================================================
-- 商品库 AI 识别能力改造脚本（增强版）
-- 适用场景：在已有 shop-product 库上执行增量改造
-- 执行前请备份数据
-- 注意：本脚本为一次性迁移脚本，重复执行可能因外键已存在而报错
-- ============================================================

USE `shop-product`;

-- 1. 新建商品类别表，映射 YOLO 模型输出的 class_id
CREATE TABLE IF NOT EXISTS `t_product_category` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(255) NOT NULL COMMENT 'YOLO 英文类别名称',
  `display_name` varchar(255) DEFAULT NULL COMMENT '中文展示名称',
  `yolo_class_id` int NOT NULL COMMENT 'YOLO 模型输出的 class_id',
  `description` varchar(500) DEFAULT NULL COMMENT '类别描述',
  `sort_order` int DEFAULT 0 COMMENT '排序',
  `status` tinyint DEFAULT 1 COMMENT '状态：1启用 0禁用',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_yolo_class_id` (`yolo_class_id`),
  KEY `idx_status_sort` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品类别表';

-- 2. 商品表增加 AI 识别所需字段
ALTER TABLE `t_product`
  ADD COLUMN IF NOT EXISTS `category_id` bigint DEFAULT NULL COMMENT '商品类别ID' AFTER `stock`,
  ADD COLUMN IF NOT EXISTS `image_url` varchar(500) DEFAULT NULL COMMENT '商品图片URL' AFTER `category_id`,
  ADD COLUMN IF NOT EXISTS `sales` int DEFAULT 0 COMMENT '销量' AFTER `image_url`,
  ADD COLUMN IF NOT EXISTS `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间' AFTER `sales`,
  ADD COLUMN IF NOT EXISTS `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER `create_time`,
  ADD KEY IF NOT EXISTS `idx_category_id` (`category_id`),
  ADD KEY IF NOT EXISTS `idx_sales` (`sales`);

-- 3. 新建 AI 识别日志表
CREATE TABLE IF NOT EXISTS `t_recognition_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `uid` bigint DEFAULT NULL COMMENT '用户id',
  `request_id` varchar(64) NOT NULL COMMENT '请求唯一标识',
  `image_url` varchar(500) DEFAULT NULL COMMENT '识别图片URL',
  `recognized_category_id` bigint DEFAULT NULL COMMENT '识别出的类别ID',
  `recognized_category_name` varchar(255) DEFAULT NULL COMMENT '识别出的类别名称',
  `confidence` decimal(5,4) DEFAULT NULL COMMENT '置信度',
  `top_product_id` bigint DEFAULT NULL COMMENT '推荐的首个商品ID',
  `recommend_product_ids` varchar(500) DEFAULT NULL COMMENT '推荐商品ID列表，逗号分隔',
  `detection_result_json` text COMMENT 'YOLO 原始识别结果 JSON',
  `status` tinyint DEFAULT 1 COMMENT '识别状态：1成功 0失败',
  `processing_time_ms` int DEFAULT NULL COMMENT '识别耗时毫秒',
  `error_msg` varchar(500) DEFAULT NULL COMMENT '失败原因',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_request_id` (`request_id`),
  KEY `idx_uid_create_time` (`uid`, `create_time`),
  KEY `idx_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 识别日志表';

-- 4. 初始化 19 个 YOLO 零食类别
INSERT INTO `t_product_category` (`id`, `name`, `display_name`, `yolo_class_id`, `description`, `sort_order`, `status`) VALUES
(1, 'Ashi Mashi snacks', 'Ashi Mashi 零食', 0, 'Ashi Mashi 零食', 1, 1),
(2, 'Chee pellet ketchup', 'Chee pellet 番茄酱味', 1, 'Chee pellet 番茄酱味', 2, 1),
(3, 'Chee pellet vinegar', 'Chee pellet 醋味', 2, 'Chee pellet 醋味', 3, 1),
(4, 'Cheetoz chili chips', 'Cheetoz 辣椒味薯片', 3, 'Cheetoz 辣椒味薯片', 4, 1),
(5, 'Cheetoz ketchup chips', 'Cheetoz 番茄酱味薯片', 4, 'Cheetoz 番茄酱味薯片', 5, 1),
(6, 'Cheetoz onion and parsley chips', 'Cheetoz 洋葱香菜味薯片', 5, 'Cheetoz 洋葱香菜味薯片', 6, 1),
(7, 'Cheetoz salty chips', 'Cheetoz 咸味薯片', 6, 'Cheetoz 咸味薯片', 7, 1),
(8, 'Cheetoz snack 30g', 'Cheetoz 零食 30g', 7, 'Cheetoz 零食 30g', 8, 1),
(9, 'Cheetoz snack 90g', 'Cheetoz 零食 90g', 8, 'Cheetoz 零食 90g', 9, 1),
(10, 'Cheetoz vinegar chips', 'Cheetoz 醋味薯片', 9, 'Cheetoz 醋味薯片', 10, 1),
(11, 'Cheetoz wheelsnack', 'Cheetoz 车轮零食', 10, 'Cheetoz 车轮零食', 11, 1),
(12, 'Maz Maz ketchup chips', 'Maz Maz 番茄酱味薯片', 11, 'Maz Maz 番茄酱味薯片', 12, 1),
(13, 'Maz Maz potato sticks', 'Maz Maz 土豆条', 12, 'Maz Maz 土豆条', 13, 1),
(14, 'Maz Maz salty chips', 'Maz Maz 咸味薯片', 13, 'Maz Maz 咸味薯片', 14, 1),
(15, 'Maz Maz vinegar chips', 'Maz Maz 醋味薯片', 14, 'Maz Maz 醋味薯片', 15, 1),
(16, 'Mini Lina', 'Mini Lina 饼干', 15, 'Mini Lina 饼干', 16, 1),
(17, 'Minoo cream biscuit', 'Minoo 奶油饼干', 16, 'Minoo 奶油饼干', 17, 1),
(18, 'Naderi mini cookie', 'Naderi 迷你曲奇', 17, 'Naderi 迷你曲奇', 18, 1),
(19, 'Naderi mini wafer', 'Naderi 迷你威化', 18, 'Naderi 迷你威化', 19, 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `sort_order` = VALUES(`sort_order`),
  `status` = VALUES(`status`);

-- 5. 初始化零食商品数据（每个类别一个 SKU）
-- 注意：如果 t_product 已有业务数据，请先确认是否需要清空或保留
INSERT INTO `t_product` (`id`, `name`, `price`, `stock`, `category_id`, `image_url`, `sales`) VALUES
(1, 'Ashi Mashi 经典零食', 12.90, 500, 1, '/images/products/ashi_mashi.jpg', 120),
(2, 'Chee pellet 番茄酱味', 8.50, 800, 2, '/images/products/chee_ketchup.jpg', 230),
(3, 'Chee pellet 醋味', 8.50, 700, 3, '/images/products/chee_vinegar.jpg', 180),
(4, 'Cheetoz 辣椒味薯片', 10.00, 600, 4, '/images/products/cheetoz_chili.jpg', 340),
(5, 'Cheetoz 番茄酱味薯片', 10.00, 650, 5, '/images/products/cheetoz_ketchup.jpg', 410),
(6, 'Cheetoz 洋葱香菜味薯片', 10.50, 500, 6, '/images/products/cheetoz_onion.jpg', 290),
(7, 'Cheetoz 咸味薯片', 9.50, 900, 7, '/images/products/cheetoz_salty.jpg', 520),
(8, 'Cheetoz 零食 30g', 5.00, 1200, 8, '/images/products/cheetoz_30g.jpg', 880),
(9, 'Cheetoz 零食 90g', 12.00, 800, 9, '/images/products/cheetoz_90g.jpg', 760),
(10, 'Cheetoz 醋味薯片', 10.00, 550, 10, '/images/products/cheetoz_vinegar.jpg', 310),
(11, 'Cheetoz 车轮零食', 11.50, 600, 11, '/images/products/cheetoz_wheel.jpg', 270),
(12, 'Maz Maz 番茄酱味薯片', 9.80, 700, 12, '/images/products/maz_ketchup.jpg', 330),
(13, 'Maz Maz 土豆条', 8.80, 850, 13, '/images/products/maz_sticks.jpg', 450),
(14, 'Maz Maz 咸味薯片', 9.50, 720, 14, '/images/products/maz_salty.jpg', 380),
(15, 'Maz Maz 醋味薯片', 9.80, 680, 15, '/images/products/maz_vinegar.jpg', 300),
(16, 'Mini Lina 饼干', 7.50, 1000, 16, '/images/products/mini_lina.jpg', 620),
(17, 'Minoo 奶油饼干', 8.00, 900, 17, '/images/products/minoo_biscuit.jpg', 540),
(18, 'Naderi 迷你曲奇', 9.00, 750, 18, '/images/products/naderi_cookie.jpg', 470),
(19, 'Naderi 迷你威化', 9.50, 800, 19, '/images/products/naderi_wafer.jpg', 430)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `price` = VALUES(`price`),
  `stock` = VALUES(`stock`),
  `category_id` = VALUES(`category_id`),
  `image_url` = VALUES(`image_url`),
  `sales` = VALUES(`sales`);

-- 6. 添加外键约束（确保数据一致性）
-- 注意：若外键已存在，请先手动删除后再执行
ALTER TABLE `t_product`
  ADD CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `t_product_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `t_recognition_log`
  ADD CONSTRAINT `fk_recognition_category` FOREIGN KEY (`recognized_category_id`) REFERENCES `t_product_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_recognition_product` FOREIGN KEY (`top_product_id`) REFERENCES `t_product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
