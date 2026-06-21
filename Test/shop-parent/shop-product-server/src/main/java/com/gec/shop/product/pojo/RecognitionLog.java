package com.gec.shop.product.pojo;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * AI 识别日志实体类
 */
@Data
@TableName("t_recognition_log")
public class RecognitionLog implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long uid;
    private String requestId;
    private String imageUrl;
    private Long recognizedCategoryId;
    private String recognizedCategoryName;
    private BigDecimal confidence;
    private Long topProductId;
    private String recommendProductIds;
    private String detectionResultJson;
    private Integer status;
    private Integer processingTimeMs;
    private String errorMsg;
    private LocalDateTime createTime;
}
