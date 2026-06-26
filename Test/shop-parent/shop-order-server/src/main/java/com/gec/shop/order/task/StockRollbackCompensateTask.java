package com.gec.shop.order.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.gec.shop.order.feign.IProductFeignService;
import com.gec.shop.order.mapper.CompensateLogMapper;
import com.gec.shop.order.pojo.CompensateLog;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 库存回滚补偿定时任务
 *
 * 职责:
 * - 扫描 t_compensate_log 中 status=PENDING 的 STOCK_ROLLBACK 记录
 * - 重试调用 product 服务回滚库存
 * - 成功则标记 SUCCESS,达到最大重试次数仍失败标记 FAILED
 *
 * 多实例安全:
 * - compensate() 方法加 @Transactional,SELECT ... FOR UPDATE 在事务内加行锁
 * - 状态更新直接走 mapper(同事务),避免 REQUIRES_NEW 对已锁行 UPDATE 产生死锁
 * - 不引入 ShedLock,单实例部署足够;多实例时行锁防止重复补偿
 *
 * 调度:每 30 秒执行一次
 */
@Slf4j
@Component
public class StockRollbackCompensateTask {

    @Autowired
    private CompensateLogMapper compensateLogMapper;

    @Autowired
    private IProductFeignService productFeignService;

    @Scheduled(fixedDelay = 30_000)
    @Transactional(rollbackFor = Exception.class)
    public void compensate() {
        List<CompensateLog> pendingList = compensateLogMapper.selectList(
                new LambdaQueryWrapper<CompensateLog>()
                        .eq(CompensateLog::getBizType, "STOCK_ROLLBACK")
                        .eq(CompensateLog::getStatus, "PENDING")
                        .last("LIMIT 50 FOR UPDATE")
        );

        if (pendingList.isEmpty()) {
            return;
        }
        log.info("库存回滚补偿任务扫描到 {} 条待处理记录", pendingList.size());

        for (CompensateLog compensateLog : pendingList) {
            processOne(compensateLog);
        }
    }

    /**
     * 处理单条补偿记录
     */
    private void processOne(CompensateLog compensateLog) {
        try {
            // 解析 payload: {"pid":1,"number":2}
            long pid = extractPid(compensateLog.getPayload());
            int number = extractNumber(compensateLog.getPayload());

            boolean rollbackOk = productFeignService.rollbackStock(pid, number);
            if (rollbackOk) {
                // 直接 mapper 更新,加入当前事务,避免 REQUIRES_NEW 对已锁行 UPDATE 死锁
                CompensateLog successUpdate = new CompensateLog();
                successUpdate.setId(compensateLog.getId());
                successUpdate.setStatus("SUCCESS");
                compensateLogMapper.updateById(successUpdate);
                log.info("库存回滚补偿成功: id={}, pid={}, number={}", compensateLog.getId(), pid, number);
            } else {
                // 回滚返回 false,增加重试计数
                incrementRetryOrMarkFailed(compensateLog);
            }
        } catch (Exception e) {
            log.error("库存回滚补偿异常: id={}, retryCount={}", compensateLog.getId(), compensateLog.getRetryCount(), e);
            incrementRetryOrMarkFailed(compensateLog);
        }
    }

    /**
     * 增加重试计数,达到上限标记 FAILED
     */
    private void incrementRetryOrMarkFailed(CompensateLog compensateLog) {
        int newRetryCount = compensateLog.getRetryCount() + 1;
        CompensateLog update = new CompensateLog();
        update.setId(compensateLog.getId());
        update.setRetryCount(newRetryCount);
        if (newRetryCount >= compensateLog.getMaxRetry()) {
            update.setStatus("FAILED");
            log.warn("库存回滚补偿达到最大重试次数,标记为 FAILED: id={}, retryCount={}",
                    compensateLog.getId(), newRetryCount);
        }
        compensateLogMapper.updateById(update);
    }

    /**
     * 从 payload JSON 中提取 pid
     */
    private long extractPid(String payload) {
        // 简易解析,避免引入 JSON 库依赖
        // payload 格式: {"pid":1,"number":2}
        return Long.parseLong(payload.replaceAll(".*\"pid\":(\\d+).*", "$1"));
    }

    /**
     * 从 payload JSON 中提取 number
     */
    private int extractNumber(String payload) {
        return Integer.parseInt(payload.replaceAll(".*\"number\":(\\d+).*", "$1"));
    }
}
