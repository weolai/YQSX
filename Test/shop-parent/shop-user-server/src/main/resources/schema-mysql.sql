-- shop-user-service 数据库初始化脚本
-- 库: shop_user
-- 表: t_user, t_sms_code
--
-- 说明:
-- - 使用 IF NOT EXISTS 容器,支持 initialization-mode=always 重复执行
-- - 字段对齐 com.gec.shop.user.pojo.User / SmsCode 实体
-- - continue-on-error=true 兜底,容忍 ALTER 重复执行的 Duplicate column 错误

-- ============================================================
-- t_user 用户主表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_user (
  id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  username     VARCHAR(64)  NOT NULL                COMMENT '用户名',
  phone        VARCHAR(20)  DEFAULT NULL            COMMENT '手机号',
  password     VARCHAR(128) NOT NULL                COMMENT '密码(加盐哈希)',
  nickname     VARCHAR(64)  DEFAULT NULL            COMMENT '昵称',
  status       TINYINT      NOT NULL DEFAULT 1      COMMENT '状态: 1启用 0禁用',
  is_deleted   TINYINT      NOT NULL DEFAULT 0      COMMENT '逻辑删除: 0未删 1已删',
  create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username),
  UNIQUE KEY uk_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户主表';

-- ============================================================
-- t_sms_code 短信验证码表
-- ============================================================
CREATE TABLE IF NOT EXISTS t_sms_code (
  id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  phone        VARCHAR(20)  NOT NULL                COMMENT '手机号',
  code         VARCHAR(8)   NOT NULL                COMMENT '验证码',
  type         VARCHAR(32)  NOT NULL                COMMENT '类型: REGISTER / RESET_PASSWORD',
  expire_time  DATETIME     NOT NULL                COMMENT '过期时间',
  used         TINYINT      NOT NULL DEFAULT 0      COMMENT '是否已使用: 0未用 1已用',
  create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_phone_type_create (phone, type, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信验证码表';
