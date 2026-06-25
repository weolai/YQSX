-- ============================================================
-- shop_user 数据库手机号与短信验证码迁移脚本
-- 影响范围：用户注册、密码重置流程
-- 说明：
--   1. 为用户表新增手机号字段，并建立唯一索引
--   2. 新增短信验证码表，支持注册/重置密码两类场景
--   3. 历史用户手机号允许为空，新注册用户必须填写
-- ============================================================

CREATE DATABASE IF NOT EXISTS `shop_user` DEFAULT CHARACTER SET utf8mb4;
USE `shop_user`;

-- 用户表新增手机号字段
ALTER TABLE `t_user`
    ADD COLUMN `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号' AFTER `username`,
    ADD UNIQUE KEY `uk_phone` (`phone`);

-- 短信验证码表
CREATE TABLE IF NOT EXISTS `t_sms_code` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
    `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
    `code` VARCHAR(10) NOT NULL COMMENT '验证码',
    `type` VARCHAR(32) NOT NULL COMMENT '用途：REGISTER / RESET_PASSWORD',
    `expire_time` datetime NOT NULL COMMENT '过期时间',
    `used` tinyint NOT NULL DEFAULT 0 COMMENT '是否已使用：0 否 1 是',
    `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_phone_type_create_time` (`phone`, `type`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信验证码表';
