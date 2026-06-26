package com.gec.shop.order.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.gec.shop.order.pojo.CompensateLog;

/**
 * 补偿日志 Mapper
 *
 * 多实例安全说明:
 * - 扫描与状态更新使用 SELECT FOR UPDATE 行锁,防止多实例重复补偿
 * - 不引入 ShedLock,以最简方案满足单实例/低并发场景
 */
public interface CompensateLogMapper extends BaseMapper<CompensateLog> {
}
