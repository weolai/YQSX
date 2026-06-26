-- ============================================================
-- shop-order-service 数据库初始化脚本
-- 库: shop-order
-- ============================================================
-- 说明:
-- - ALTER 语句使用 continue-on-error=true 容忍重复执行
-- - 新增 t_compensate_log 表(Sprint 2 事务一致性补偿)

-- ============================================================
-- t_order 字段补全(幂等容忍重复执行)
-- ============================================================
ALTER TABLE `t_order` ADD COLUMN `version` INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';
ALTER TABLE `t_order` ADD COLUMN `order_no` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '订单编号';
ALTER TABLE `t_order` ADD COLUMN `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
ALTER TABLE `t_order` ADD COLUMN `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- ============================================================
-- t_compensate_log 补偿日志表(Sprint 2 新增)
-- 用途: 记录需要补偿的操作(createOrder 失败后的库存回滚),
--       定时任务扫描 PENDING 状态记录重试,保证最终一致性
-- ============================================================
CREATE TABLE IF NOT EXISTS t_compensate_log (
  id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  biz_type     VARCHAR(32)  NOT NULL                COMMENT '业务类型: STOCK_ROLLBACK',
  biz_id       VARCHAR(64)  NOT NULL                COMMENT '业务ID: 如 pid (商品ID)',
  order_id     BIGINT       DEFAULT NULL            COMMENT '关联订单ID(可能为空,如订单落库前失败)',
  payload      VARCHAR(512) NOT NULL               COMMENT '补偿参数 JSON, 如 {"pid":1,"number":2}',
  status       VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING / SUCCESS / FAILED',
  retry_count  INT          NOT NULL DEFAULT 0      COMMENT '已重试次数',
  max_retry    INT          NOT NULL DEFAULT 3      COMMENT '最大重试次数',
  create_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_status_create (status, create_time),
  KEY idx_biz_type_biz_id (biz_type, biz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='补偿日志表';
