package com.gec.shop.order.pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 补偿日志实体类
 *
 * 用途: 记录需要补偿的操作(如 createOrder 失败后的库存回滚),
 *       定时任务扫描 PENDING 状态记录重试,保证最终一致性
 *
 * 状态机:
 *   PENDING  -> SUCCESS   (补偿成功)
 *   PENDING  -> FAILED    (重试次数耗尽)
 *   PENDING  -> PENDING   (重试中, retry_count++)
 */
@Data
@TableName("t_compensate_log")
public class CompensateLog implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 业务类型: STOCK_ROLLBACK
     */
    private String bizType;

    /**
     * 业务ID: 如 pid (商品ID)
     */
    private String bizId;

    /**
     * 关联订单ID(可能为空,如订单落库前失败)
     */
    private Long orderId;

    /**
     * 补偿参数 JSON, 如 {"pid":1,"number":2}
     */
    private String payload;

    /**
     * 状态: PENDING / SUCCESS / FAILED
     */
    private String status;

    /**
     * 已重试次数
     */
    private Integer retryCount;

    /**
     * 最大重试次数
     */
    private Integer maxRetry;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
