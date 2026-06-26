package com.gec.shop.order.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.gec.shop.order.mapper.OrderMapper;
import com.gec.shop.order.pojo.CompensateLog;
import com.gec.shop.order.pojo.Order;
import com.gec.shop.order.feign.IProductFeignService;
import com.gec.shop.order.feign.IUserFeignService;
import com.gec.shop.order.pojo.User;
import com.gec.shop.order.service.CompensateLogInternalService;
import com.gec.shop.order.service.OrderService;
import com.gec.shop.product.pojo.Product;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 订单服务实现类
 *
 * Sprint 2 重构:
 * - createOrder 移除 @Transactional,拆分为两阶段避免长事务
 *   阶段1: Feign 扣库存(product 服务内部事务)
 *   阶段2: 本地事务落订单 + 写补偿日志
 *   阶段2 失败: 写 t_compensate_log(STOCK_ROLLBACK),立即尝试回滚,失败由定时任务重试
 */
@Slf4j
@Service
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {

    @Autowired
    private IProductFeignService productFeignService;

    @Autowired
    private IUserFeignService userFeignService;

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    private CompensateLogInternalService compensateLogInternalService;

    private Counter orderCreateCounter;

    @Autowired
    public void initCounter() {
        orderCreateCounter = Counter.builder("order_create_total")
                .description("Total number of orders created")
                .register(meterRegistry);
    }

    /**
     * 创建订单(无 @Transactional,拆分为两阶段)
     *
     * 阶段1: Feign 扣库存(事务外,product 服务内部事务已提交)
     * 阶段2: 本地事务落订单 + 写补偿日志
     *
     * 一致性保障:
     * - 阶段2 失败时,库存已扣减但订单未落库,写 t_compensate_log 待补偿
     * - 立即尝试回滚库存,失败则由 StockRollbackCompensateTask 定时重试
     */
    @Override
    public Order createOrder(Long pid, Long uid, Integer number) {
        validateCreateRequest(number);
        Product product = fetchAndValidateProduct(pid, number);
        String username = resolveUsername(uid);
        // 阶段1: 扣库存(Feign,事务外)
        reduceStockOrThrow(pid, number);
        // 阶段2: 本地事务落订单
        return saveOrderWithCompensation(pid, uid, number, product, username);
    }

    /**
     * 校验下单数量是否合法
     */
    private void validateCreateRequest(Integer number) {
        if (number == null || number <= 0) {
            throw new RuntimeException("购买数量必须大于0");
        }
    }

    /**
     * 获取商品并校验商品存在性与库存前置条件
     */
    private Product fetchAndValidateProduct(Long pid, Integer number) {
        Product product = productFeignService.get(pid);
        if (product == null || product.getId() == null || product.getId() <= 0) {
            throw new RuntimeException("商品不存在: pid=" + pid);
        }
        if (product.getStock() != null && product.getStock() < number) {
            throw new RuntimeException("库存不足: 当前库存=" + product.getStock() + ", 需求=" + number);
        }
        return product;
    }

    /**
     * 通过Feign调用用户服务获取用户名，失败时降级使用兜底数据
     */
    private String resolveUsername(Long uid) {
        try {
            User user = userFeignService.get(uid, "true");
            if (user != null && user.getUsername() != null) {
                return user.getUsername();
            }
            log.warn("用户服务返回空数据，使用兜底用户名: uid={}", uid);
        } catch (Exception e) {
            log.warn("获取用户信息失败，使用兜底用户名: uid={}", uid, e);
        }
        return "user_" + uid;
    }

    /**
     * 原子扣减库存，失败抛出异常
     */
    private void reduceStockOrThrow(Long pid, Integer number) {
        boolean stockReduced = productFeignService.reduceStock(pid, number);
        if (!stockReduced) {
            throw new RuntimeException("库存不足或商品服务不可用: pid=" + pid + ", number=" + number);
        }
    }

    /**
     * 本地事务落订单 + 写补偿日志
     *
     * 事务策略:
     * - saveOrderInTransaction: REQUIRED (落订单)
     * - 若落订单失败,写 t_compensate_log(STOCK_ROLLBACK) + 立即尝试回滚库存
     * - 立即回滚失败时,补偿日志由定时任务重试
     */
    private Order saveOrderWithCompensation(Long pid, Long uid, Integer number,
                                              Product product, String username) {
        Order order = buildOrder(pid, uid, number, product, username);
        try {
            saveOrderInTransaction(order);
            orderCreateCounter.increment();
            log.info("创建订单成功: uid={}, pid={}, number={}, orderNo={}", uid, pid, number, order.getOrderNo());
            return order;
        } catch (Exception e) {
            log.error("订单落库失败,启动补偿: pid={}, number={}", pid, number, e);
            handleOrderSaveFailure(pid, number, order, e);
            throw e;
        }
    }

    /**
     * 本地事务落订单(REQUIRED)
     * 仅覆盖订单落库,不包含 Feign 调用,避免长事务
     */
    @Transactional(rollbackFor = Exception.class)
    public void saveOrderInTransaction(Order order) {
        log.info("生成订单号: uid={}, pid={}, generatedOrderNo={}", order.getUid(), order.getPid(), order.getOrderNo());
        super.save(order);
    }

    /**
     * 订单落库失败处理:
     * 1. 写 t_compensate_log(STOCK_ROLLBACK, PENDING) - 保证有补偿记录
     * 2. 立即尝试回滚库存 - 快速恢复
     * 3. 立即回滚失败时,依赖定时任务重试补偿日志
     */
    private void handleOrderSaveFailure(Long pid, Integer number, Order order, Exception cause) {
        // 1. 写补偿日志(独立事务,保证即使外层异常也能写入)
        CompensateLog compensateLog = buildStockRollbackLog(pid, number, order);
        try {
            compensateLogInternalService.saveCompensateLog(compensateLog);
            log.info("已写入补偿日志: bizType=STOCK_ROLLBACK, pid={}, number={}", pid, number);
        } catch (Exception logEx) {
            log.error("补偿日志写入失败,需人工介入: pid={}, number={}", pid, number, logEx);
        }
        // 2. 立即尝试回滚库存
        try {
            boolean rollbackOk = productFeignService.rollbackStock(pid, number);
            if (rollbackOk) {
                // 回滚成功,更新补偿日志为 SUCCESS
                compensateLogInternalService.markCompensateSuccess(compensateLog.getId());
                log.info("库存立即回滚成功: pid={}, number={}", pid, number);
            } else {
                log.warn("库存立即回滚返回 false,将由定时任务重试: pid={}, number={}", pid, number);
            }
        } catch (Exception rollbackEx) {
            // 立即回滚失败,补偿日志保持 PENDING,由定时任务重试
            log.error("库存立即回滚失败,等待定时任务重试: pid={}, number={}", pid, number, rollbackEx);
        }
    }

    /**
     * 构建库存回滚补偿日志
     */
    private CompensateLog buildStockRollbackLog(Long pid, Integer number, Order order) {
        CompensateLog entity = new CompensateLog();
        entity.setBizType("STOCK_ROLLBACK");
        entity.setBizId(String.valueOf(pid));
        entity.setOrderId(order.getId());
        entity.setPayload("{\"pid\":" + pid + ",\"number\":" + number + "}");
        entity.setStatus("PENDING");
        entity.setRetryCount(0);
        entity.setMaxRetry(3);
        return entity;
    }

    /**
     * 组装订单实体（不含持久化）
     */
    private Order buildOrder(Long pid, Long uid, Integer number, Product product, String username) {
        Order order = new Order();
        String generatedOrderNo = generateOrderNo();
        order.setOrderNo(generatedOrderNo);
        order.setPid(pid);
        order.setProductName(product.getName());
        order.setProductPrice(product.getPrice());
        order.setUid(uid);
        order.setUsername(username);
        order.setNumber(number);
        order.setStatus("WAIT_PAY");
        order.setVersion(0);
        order.setCreateTime(LocalDateTime.now());
        order.setUpdateTime(LocalDateTime.now());
        return order;
    }

    @Override
    public Order findById(Long id) {
        Order order = super.getById(id);
        if (order == null) {
            return null;
        }
        refreshProductName(order);
        return order;
    }

    @Override
    public Order findPendingOrder(Long uid, Long pid) {
        return super.lambdaQuery()
                .eq(Order::getUid, uid)
                .eq(Order::getPid, pid)
                .eq(Order::getStatus, "WAIT_PAY")
                .orderByDesc(Order::getId)
                .last("LIMIT 1")
                .one();
    }

    @Override
    public List<Order> findByUid(Long uid) {
        List<Order> orders = super.lambdaQuery()
                .eq(Order::getUid, uid)
                .orderByDesc(Order::getId)
                .list();
        if (!orders.isEmpty()) {
            refreshProductNamesBatch(orders);
        }
        return orders;
    }

    /**
     * 批量刷新订单列表中的商品名称，1 次 Feign 调用替代 N 次
     */
    private void refreshProductNamesBatch(List<Order> orders) {
        List<Long> pids = orders.stream()
                .map(Order::getPid)
                .distinct()
                .collect(Collectors.toList());
        try {
            Map<Long, String> nameMap = productFeignService.batchGetProductNames(pids);
            orders.forEach(order -> {
                String name = nameMap.get(order.getPid());
                if (name != null) {
                    order.setProductName(name);
                }
            });
        } catch (Exception e) {
            log.warn("批量刷新商品名称失败, uid={}, orderCount={}", orders.isEmpty() ? null : orders.get(0).getUid(), orders.size(), e);
        }
    }

    /**
     * 刷新订单中的商品名称，保持与商品库一致
     * Feign 调用失败时仅记录日志，不影响订单查询
     */
    private void refreshProductName(Order order) {
        try {
            Product product = productFeignService.get(order.getPid());
            if (product != null && product.getName() != null) {
                order.setProductName(product.getName());
            }
        } catch (Exception e) {
            log.warn("刷新商品名称失败, orderId={}, pid={}", order.getId(), order.getPid(), e);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int updateStatus(Long id, String status) {
        Order order = super.getById(id);
        if (order == null) {
            throw new RuntimeException("订单不存在: id=" + id);
        }
        String current = order.getStatus();
        // 幂等：目标状态与当前状态一致，直接返回成功
        if (current != null && current.equals(status)) {
            log.info("订单状态幂等命中: id={}, status={}", id, status);
            return 1;
        }
        if (!isValidTransition(current, status)) {
            throw new RuntimeException("非法状态转换: " + current + " -> " + status);
        }
        // CAS 更新：WHERE id=? AND status=? 防止并发竞态
        LambdaUpdateWrapper<Order> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(Order::getId, id)
               .eq(Order::getStatus, current)
               .set(Order::getStatus, status);
        int rows = super.baseMapper.update(null, wrapper);
        if (rows == 0) {
            log.warn("订单状态CAS更新失败(并发冲突): id={}, expected={}, actual={}",
                    id, current, super.getById(id).getStatus());
            return 0;
        }
        log.info("更新订单状态成功: id={}, {} -> {}", id, current, status);
        return 1;
    }

    private boolean isValidTransition(String from, String to) {
        if ("WAIT_PAY".equals(from) && "PAID".equals(to)) {
            return true;
        }
        if ("PAID".equals(from) && "FINISHED".equals(to)) {
            return true;
        }
        if ("WAIT_PAY".equals(from) && "CANCELED".equals(to)) {
            return true;
        }
        return false;
    }

    /**
     * 生成订单号：yyyyMMddHHmmss + 6位随机数，共20位
     */
    private String generateOrderNo() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int random = ThreadLocalRandom.current().nextInt(100000, 1000000);
        return timestamp + random;
    }
}
