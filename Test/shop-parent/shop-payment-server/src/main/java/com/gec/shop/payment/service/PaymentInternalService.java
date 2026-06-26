package com.gec.shop.payment.service;

import com.gec.shop.payment.mapper.PaymentMapper;
import com.gec.shop.payment.pojo.Payment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 支付内部服务(独立 Bean,承载事务方法)
 *
 * 设计目的:
 * - 解决 PaymentServiceImpl 自调用导致 @Transactional 失效问题
 *   (this.save() / this.compensateDeletePayment() 不走代理,事务不生效)
 * - 通过注入独立 Bean,经由 Spring 代理调用,保证事务边界正确
 *
 * 事务策略:
 * - save:                REQUIRED   (与外层共享事务,外层回滚则一起回滚)
 * - compensateDeletePayment: REQUIRES_NEW (独立事务,即使外层已失败也能提交补偿)
 */
@Slf4j
@Service
public class PaymentInternalService {

    @Autowired
    private PaymentMapper paymentMapper;

    /**
     * 保存支付记录
     * REQUIRED: 若外层有事务则加入,否则新建
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean save(Payment payment) {
        return paymentMapper.insert(payment) > 0;
    }

    /**
     * 补偿删除支付记录
     * REQUIRES_NEW: 独立事务,即使外层事务已标记回滚,本方法仍能独立提交
     * 避免外层异常导致补偿也一起回滚,造成支付记录残留
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void compensateDeletePayment(Long paymentId) {
        try {
            paymentMapper.deleteById(paymentId);
            log.info("补偿删除支付记录成功: paymentId={}", paymentId);
        } catch (Exception e) {
            // 补偿本身失败:不吞掉异常,让事务回滚,由上层记录到日志供人工处理
            log.error("补偿删除支付记录失败,需人工处理: paymentId={}", paymentId, e);
            throw e;
        }
    }
}
