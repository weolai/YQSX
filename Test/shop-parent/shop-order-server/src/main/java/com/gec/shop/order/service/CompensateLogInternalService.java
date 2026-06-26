package com.gec.shop.order.service;

import com.gec.shop.order.mapper.CompensateLogMapper;
import com.gec.shop.order.pojo.CompensateLog;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 补偿日志内部服务(独立 Bean,承载事务方法)
 *
 * 设计目的:
 * - 解决 OrderServiceImpl 自调用导致 @Transactional(REQUIRES_NEW) 失效问题
 * - 补偿日志写入/状态更新必须独立事务,保证即使外层订单事务已回滚也能写入
 */
@Slf4j
@Service
public class CompensateLogInternalService {

    @Autowired
    private CompensateLogMapper compensateLogMapper;

    /**
     * 写补偿日志(REQUIRES_NEW,独立事务)
     * 保证即使外层事务已回滚,补偿日志仍能写入
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void saveCompensateLog(CompensateLog log) {
        compensateLogMapper.insert(log);
    }

    /**
     * 标记补偿日志为 SUCCESS(REQUIRES_NEW)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void markCompensateSuccess(Long compensateLogId) {
        if (compensateLogId == null) {
            return;
        }
        CompensateLog update = new CompensateLog();
        update.setId(compensateLogId);
        update.setStatus("SUCCESS");
        compensateLogMapper.updateById(update);
    }
}
