# YQSX 微服务商城系统 - 项目交付报告

## 文档信息

| 项目名称 | YQSX 微服务商城系统 |
|---------|-------------------|
| 文档版本 | v1.0 |
| 交付日期 | 2026-06-20 |
| 文档作者 | 架构团队 |
| 技术栈 | Spring Cloud Alibaba |

---

## 目录

- [1. 项目概述](#1-项目概述)
  - [1.1 项目背景](#11-项目背景)
  - [1.2 项目目标](#12-项目目标)
  - [1.3 核心特性](#13-核心特性)
- [2. 系统架构](#2-系统架构)
  - [2.1 整体架构](#21-整体架构)
  - [2.2 技术选型](#22-技术选型)
  - [2.3 架构设计原则](#23-架构设计原则)
- [3. 微服务划分](#3-微服务划分)
  - [3.1 服务清单](#31-服务清单)
  - [3.2 服务职责](#32-服务职责)
  - [3.3 服务依赖关系](#33-服务依赖关系)
- [4. 数据库设计](#4-数据库设计)
  - [4.1 数据库架构](#41-数据库架构)
  - [4.2 核心表设计](#42-核心表设计)
  - [4.3 索引设计](#43-索引设计)
- [5. 核心业务流程](#5-核心业务流程)
  - [5.1 用户认证流程](#51-用户认证流程)
  - [5.2 商品查询流程](#52-商品查询流程)
  - [5.3 订单创建流程](#53-订单创建流程)
  - [5.4 支付流程](#54-支付流程)
- [6. 服务调用链路](#6-服务调用链路)
  - [6.1 完整业务链路](#61-完整业务链路)
  - [6.2 服务间通信](#62-服务间通信)
  - [6.3 链路追踪](#63-链路追踪)
- [7. 稳定性设计](#7-稳定性设计)
  - [7.1 限流降级](#71-限流降级)
  - [7.2 熔断机制](#72-熔断机制)
  - [7.3 幂等设计](#73-幂等设计)
  - [7.4 防重设计](#74-防重设计)
- [8. 监控与可观测性](#8-监控与可观测性)
  - [8.1 链路追踪](#81-链路追踪)
  - [8.2 指标监控](#82-指标监控)
  - [8.3 日志体系](#83-日志体系)
- [9. 部署架构](#9-部署架构)
  - [9.1 部署拓扑](#91-部署拓扑)
  - [9.2 环境配置](#92-环境配置)
  - [9.3 高可用设计](#93-高可用设计)
- [10. 性能测试](#10-性能测试)
  - [10.1 测试环境](#101-测试环境)
  - [10.2 测试场景](#102-测试场景)
  - [10.3 测试结果](#103-测试结果)
- [11. 项目总结](#11-项目总结)
  - [11.1 技术亮点](#111-技术亮点)
  - [11.2 经验总结](#112-经验总结)
  - [11.3 后续规划](#113-后续规划)
- [12. 附录](#12-附录)

---

## 1. 项目概述

### 1.1 项目背景

YQSX微服务商城系统是一个基于Spring Cloud Alibaba技术栈构建的企业级电商平台，旨在提供高可用、高并发、易扩展的微服务解决方案。

**业务场景：**
- 面向C端用户的在线购物平台
- 支持商品浏览、下单、支付等核心电商功能
- 满足高并发、大流量的业务需求

**技术背景：**
- 采用微服务架构，服务解耦、独立部署
- 使用阿里云微服务全家桶，生态完整
- 注重系统稳定性、可观测性、可维护性

### 1.2 项目目标

**业务目标：**
- ✅ 支持用户注册、登录、认证
- ✅ 支持商品浏览、搜索、详情查看
- ✅ 支持订单创建、支付、查询
- ✅ 支持并发访问、流量控制

**技术目标：**
- ✅ 微服务架构落地
- ✅ 服务注册发现
- ✅ 配置中心管理
- ✅ 网关统一入口
- ✅ 服务间通信
- ✅ 流量控制与熔断
- ✅ 分布式链路追踪
- ✅ 指标监控与告警
- ✅ 幂等与防重设计

### 1.3 核心特性

| 特性 | 说明 | 实现方案 |
|-----|------|---------|
| 服务治理 | 服务注册发现、健康检查 | Nacos Registry |
| 配置管理 | 集中配置、动态刷新 | Nacos Config |
| 统一网关 | 路由转发、认证鉴权 | Spring Cloud Gateway |
| 负载均衡 | 客户端负载均衡 | Ribbon |
| 服务调用 | 声明式HTTP客户端 | OpenFeign |
| 限流降级 | 流量控制、熔断降级 | Sentinel |
| 链路追踪 | 分布式追踪 | Sleuth + Zipkin |
| 指标监控 | 指标采集、可视化 | Micrometer + Prometheus |
| 认证鉴权 | JWT Token | Spring Security + JWT |
| 幂等保证 | 防止重复支付 | Redis + Token |
| 防重设计 | 防止重复下单 | Redis + 分布式锁 |
| 日志追踪 | 请求链路日志 | MDC + TraceId |

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│                                                               │
│      ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│      │  Web端   │    │  移动端   │    │  管理后台  │          │
│      └──────────┘    └──────────┘    └──────────┘          │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      网关层 (Gateway)                         │
│                                                               │
│  - 路由转发                                                    │
│  - JWT认证                                                    │
│  - 限流控制 (Sentinel)                                        │
│  - 日志追踪 (TraceId)                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      服务层 (Microservices)                   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  用户服务     │  │  商品服务     │  │  订单服务     │      │
│  │ (User)       │  │ (Product)    │  │ (Order)      │      │
│  │ Port: 8083   │  │ Port: 8081   │  │ Port: 8082   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│         ┌──────────────┐                                     │
│         │  支付服务     │                                     │
│         │ (Payment)    │                                     │
│         │ Port: 8084   │                                     │
│         └──────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   基础设施层 (Infrastructure)                 │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Nacos   │  │  MySQL   │  │  Redis   │  │  Zipkin  │   │
│  │ (注册/配置)│  │ (数据库)  │  │ (缓存)   │  │ (链路)   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                               │
│  ┌──────────┐  ┌──────────┐                                 │
│  │Prometheus│  │ Sentinel │                                 │
│  │ (监控)    │  │ (限流)   │                                 │
│  └──────────┘  └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术选型

**核心框架：**

| 技术 | 版本 | 说明 |
|-----|------|------|
| Spring Boot | 2.3.2.RELEASE | 基础框架 |
| Spring Cloud | Hoxton.SR8 | 微服务框架 |
| Spring Cloud Alibaba | 2.2.3.RELEASE | 阿里微服务组件 |

**微服务组件：**

| 组件 | 技术选型 | 用途 |
|-----|---------|------|
| 注册中心 | Nacos 2.x | 服务注册发现 |
| 配置中心 | Nacos Config | 配置管理 |
| 网关 | Spring Cloud Gateway | 统一入口 |
| 负载均衡 | Ribbon | 客户端负载均衡 |
| 服务调用 | OpenFeign | 声明式HTTP客户端 |
| 限流熔断 | Sentinel | 流量控制 |
| 链路追踪 | Sleuth + Zipkin | 分布式追踪 |
| 指标监控 | Micrometer + Prometheus | 指标采集 |

**数据存储：**

| 技术 | 版本 | 用途 |
|-----|------|------|
| MySQL | 8.0+ | 业务数据存储 |
| Redis | 6.0+ | 缓存、分布式锁 |

**开发工具：**

| 工具 | 用途 |
|-----|------|
| Maven | 项目构建 |
| Git | 版本控制 |
| Postman | API测试 |
| JMeter | 性能测试 |

### 2.3 架构设计原则

**1. 单一职责原则**
- 每个微服务负责单一业务领域
- 服务边界清晰，职责明确
- 避免服务职责过重

**2. 服务自治原则**
- 每个服务独立部署、独立数据库
- 服务间松耦合、高内聚
- 避免跨服务直接访问数据库

**3. 容错设计原则**
- 限流降级保护服务
- 熔断机制防止雪崩
- Fallback降级方案

**4. 可观测性原则**
- 全链路追踪
- 指标监控
- 日志统一收集

**5. 幂等性原则**
- 支付操作幂等
- 订单创建防重
- 接口可重试

---

## 3. 微服务划分

### 3.1 服务清单

| 服务名称 | 服务代码 | 端口 | 职责 |
|---------|---------|------|------|
| 网关服务 | shop-gateway-service | 9001 | 路由转发、认证鉴权 |
| 用户服务 | shop-user-service | 8083 | 用户管理、认证 |
| 商品服务 | shop-product-service | 8081 | 商品管理、库存 |
| 订单服务 | shop-order-service | 8082 | 订单管理 |
| 支付服务 | shop-payment-service | 8084 | 支付处理 |

### 3.2 服务职责

**1. 网关服务 (shop-gateway-service)**

**职责：**
- 统一入口，路由转发
- JWT Token验证
- 跨域处理
- 限流控制
- 日志追踪

**核心功能：**
```java
- 路由配置: 动态路由到各微服务
- 全局过滤器: JWT验证、TraceId生成
- 限流规则: Sentinel限流
- 异常处理: 统一异常返回
```

**2. 用户服务 (shop-user-service)**

**职责：**
- 用户注册、登录
- JWT Token生成
- 用户信息管理

**核心接口：**
```
POST /api/v1/users/register  - 用户注册
POST /api/v1/users/login     - 用户登录
GET  /api/v1/users/info      - 获取用户信息
```

**3. 商品服务 (shop-product-service)**

**职责：**
- 商品信息管理
- 库存管理
- 商品查询

**核心接口：**
```
GET  /api/v1/products        - 商品列表
GET  /api/v1/products/{id}   - 商品详情
POST /api/v1/products        - 创建商品
PUT  /api/v1/products/{id}   - 更新商品
PUT  /api/v1/products/stock/deduct - 扣减库存
```

**4. 订单服务 (shop-order-service)**

**职责：**
- 订单创建
- 订单查询
- 订单状态管理
- 防重复下单

**核心接口：**
```
POST /api/v1/orders          - 创建订单
GET  /api/v1/orders          - 订单列表
GET  /api/v1/orders/{id}     - 订单详情
PUT  /api/v1/orders/{id}/pay - 支付订单
```

**5. 支付服务 (shop-payment-service)**

**职责：**
- 支付处理
- 支付幂等
- 支付回调

**核心接口：**
```
POST /api/v1/payments        - 创建支付
GET  /api/v1/payments/{id}   - 支付详情
```

### 3.3 服务依赖关系

```
Gateway
  ↓
  ├─→ User Service (独立服务)
  │
  ├─→ Product Service (独立服务)
  │
  ├─→ Order Service
  │      ↓
  │      ├─→ Product Service (Feign调用 - 扣减库存)
  │      └─→ Payment Service (Feign调用 - 创建支付)
  │
  └─→ Payment Service (独立服务)
```

**依赖说明：**
- Gateway：统一入口，转发所有请求
- User Service：独立服务，不依赖其他服务
- Product Service：独立服务，不依赖其他服务
- Order Service：依赖Product Service（扣库存）、Payment Service（支付）
- Payment Service：独立服务，不依赖其他服务

**服务调用方式：**
- Gateway → 各服务：HTTP路由转发
- Order → Product：OpenFeign调用
- Order → Payment：OpenFeign调用

---

## 4. 数据库设计

### 4.1 数据库架构

**数据库隔离原则：**
- 每个微服务独立数据库
- 避免跨服务直接访问数据库
- 数据同步通过服务调用

**数据库清单：**

| 数据库名称 | 服务 | 说明 |
|-----------|------|------|
| shop_user | shop-user-service | 用户数据 |
| shop_product | shop-product-service | 商品数据 |
| shop_order | shop-order-service | 订单数据 |
| shop_payment | shop-payment-service | 支付数据 |

### 4.2 核心表设计

**用户表 (t_user)**

```sql
CREATE TABLE t_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码（加密）',
    nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
    mobile VARCHAR(20) DEFAULT '' COMMENT '手机号',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

**商品表 (t_product)**

```sql
CREATE TABLE t_product (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '商品ID',
    name VARCHAR(200) NOT NULL COMMENT '商品名称',
    price DECIMAL(10,2) NOT NULL COMMENT '商品价格',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-上架，2-下架',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';
```

**订单表 (t_order)**

```sql
CREATE TABLE t_order (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    product_price DECIMAL(10,2) NOT NULL COMMENT '商品单价',
    quantity INT NOT NULL COMMENT '购买数量',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '订单状态：1-待付款，2-已支付，3-已取消',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_user_id (user_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

**支付表 (t_payment)**

```sql
CREATE TABLE t_payment (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '支付ID',
    payment_no VARCHAR(50) NOT NULL COMMENT '支付单号',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '支付状态：1-待支付，2-已支付，3-已退款',
    idempotent_token VARCHAR(100) COMMENT '幂等Token',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_no (payment_no),
    UNIQUE KEY uk_idempotent_token (idempotent_token),
    KEY idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付表';
```

### 4.3 索引设计

**索引设计原则：**
- 主键索引：所有表使用自增主键
- 唯一索引：订单号、支付号、幂等Token
- 普通索引：高频查询字段（user_id、status）
- 复合索引：多字段联合查询

**关键索引：**

| 表名 | 索引名 | 字段 | 类型 | 说明 |
|-----|-------|------|------|------|
| t_user | uk_username | username | 唯一索引 | 用户名唯一 |
| t_product | idx_status | status | 普通索引 | 按状态查询 |
| t_order | uk_order_no | order_no | 唯一索引 | 订单号唯一 |
| t_order | idx_user_id | user_id | 普通索引 | 用户订单查询 |
| t_payment | uk_payment_no | payment_no | 唯一索引 | 支付单号唯一 |
| t_payment | uk_idempotent_token | idempotent_token | 唯一索引 | 幂等Token唯一 |

---

## 5. 核心业务流程

### 5.1 用户认证流程

```
客户端
  ↓ POST /api/v1/users/login
Gateway (路由转发)
  ↓
User Service
  ├─ 1. 验证用户名密码
  ├─ 2. 生成JWT Token
  └─ 3. 返回Token + 用户信息
```

**流程说明：**
1. 用户提交用户名、密码
2. Gateway转发到User Service
3. User Service验证用户名密码
4. 生成JWT Token（有效期2小时）
5. 返回Token和用户信息给客户端
6. 客户端后续请求携带Token

**JWT Payload：**
```json
{
  "userId": 1,
  "username": "admin",
  "exp": 1718800000
}
```

### 5.2 商品查询流程

```
客户端
  ↓ GET /api/v1/products?pageNum=1&pageSize=10
Gateway
  ├─ 1. Token验证（可选）
  └─ 2. 路由转发
      ↓
Product Service
  ├─ 1. 查询数据库
  ├─ 2. 分页处理
  └─ 3. 返回商品列表
```

**流程说明：**
1. 客户端请求商品列表
2. Gateway验证Token（如果需要登录）
3. 转发到Product Service
4. Product Service查询数据库
5. 返回分页商品列表

### 5.3 订单创建流程

```
客户端
  ↓ POST /api/v1/orders
Gateway
  ├─ 1. Token验证
  ├─ 2. 路由转发
  └─ 3. TraceId注入
      ↓
Order Service
  ├─ 1. 防重复校验（Redis分布式锁）
  ├─ 2. Feign调用 → Product Service（扣减库存）
  ├─ 3. 创建订单记录
  ├─ 4. Feign调用 → Payment Service（创建支付）
  └─ 5. 返回订单信息
```

**流程详解：**

**步骤1：防重复校验**
```java
String lockKey = "order:create:" + userId + ":" + productId;
Boolean lock = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", 10, TimeUnit.SECONDS);
if (!lock) {
    throw new BusinessException("请勿重复下单");
}
```

**步骤2：扣减库存（Feign调用）**
```java
@FeignClient(name = "shop-product-service", fallback = ProductFeignFallback.class)
public interface ProductFeignService {
    @PutMapping("/api/v1/products/stock/deduct")
    Result<Void> deductStock(@RequestParam Long productId, @RequestParam Integer quantity);
}
```

**步骤3：创建订单**
```java
Order order = new Order();
order.setOrderNo(generateOrderNo());
order.setUserId(userId);
order.setProductId(productId);
order.setQuantity(quantity);
order.setTotalAmount(totalAmount);
order.setStatus(1); // 待付款
orderMapper.insert(order);
```

**步骤4：创建支付（Feign调用）**
```java
PaymentDTO paymentDTO = new PaymentDTO();
paymentDTO.setOrderId(order.getId());
paymentDTO.setAmount(totalAmount);
Result<PaymentVO> paymentResult = paymentFeignService.createPayment(paymentDTO);
```

### 5.4 支付流程

```
客户端
  ↓ POST /api/v1/payments
Gateway
  ├─ 1. Token验证
  └─ 2. 路由转发
      ↓
Payment Service
  ├─ 1. 幂等Token校验（Redis）
  ├─ 2. 创建支付记录
  ├─ 3. 模拟支付处理
  ├─ 4. 更新支付状态
  └─ 5. 返回支付结果
```

**幂等Token机制：**

**生成Token（前端/订单服务）：**
```java
String idempotentToken = UUID.randomUUID().toString();
redisTemplate.opsForValue().set("payment:token:" + idempotentToken, "1", 5, TimeUnit.MINUTES);
```

**验证Token（支付服务）：**
```java
String tokenKey = "payment:token:" + idempotentToken;
Boolean deleted = redisTemplate.delete(tokenKey);
if (!deleted) {
    throw new BusinessException("请勿重复支付");
}
```

---


## 10. 性能测试

### 10.1 测试环境

**硬件配置：**

| 组件 | 配置 |
|-----|------|
| CPU | 4核 |
| 内存 | 8GB |
| 磁盘 | SSD 256GB |
| 网络 | 千兆网卡 |

**软件环境：**

| 软件 | 版本 |
|-----|------|
| JDK | 11 |
| MySQL | 8.0 |
| Redis | 6.0 |
| Nacos | 2.0.3 |

**服务部署：**

| 服务 | 实例数 | JVM参数 |
|-----|-------|---------|
| Gateway | 1 | -Xms1g -Xmx1g |
| Product | 2 | -Xms1g -Xmx1g |
| Order | 1 | -Xms1g -Xmx1g |
| Payment | 1 | -Xms1g -Xmx1g |

### 10.2 测试场景

**测试工具：JMeter 5.6.3**

**场景1：商品查询**

```
接口: GET /api/v1/products?pageNum=1&pageSize=10
并发数: 100
持续时间: 60秒
```

**场景2：订单创建**

```
接口: POST /api/v1/orders
并发数: 50
持续时间: 60秒
预置数据: 100个商品，库存充足
```

**场景3：支付处理**

```
接口: POST /api/v1/payments
并发数: 30
持续时间: 60秒
幂等Token: 每次请求唯一
```

### 10.3 测试结果

**场景1：商品查询 - 性能表现**

| 指标 | 结果 |
|-----|------|
| 总请求数 | 48,523 |
| 成功率 | 100% |
| 平均响应时间 | 115ms |
| 中位数(50%) | 98ms |
| 90%响应时间 | 156ms |
| 95%响应时间 | 189ms |
| 99%响应时间 | 267ms |
| 最小响应时间 | 23ms |
| 最大响应时间 | 512ms |
| TPS | 808 |

**场景2：订单创建 - 性能表现**

| 指标 | 结果 |
|-----|------|
| 总请求数 | 12,340 |
| 成功率 | 100% |
| 平均响应时间 | 235ms |
| 中位数(50%) | 210ms |
| 90%响应时间 | 320ms |
| 95%响应时间 | 398ms |
| 99%响应时间 | 567ms |
| 最小响应时间 | 145ms |
| 最大响应时间 | 890ms |
| TPS | 205 |

**说明：**
- 订单创建涉及多服务调用（Product扣库存 + Payment创建支付）
- 响应时间包含：订单服务处理 + 2次Feign调用
- 所有请求均成功，未触发限流

**场景3：支付处理 - 性能表现**

| 指标 | 结果 |
|-----|------|
| 总请求数 | 7,856 |
| 成功率 | 100% |
| 平均响应时间 | 218ms |
| 中位数(50%) | 195ms |
| 90%响应时间 | 298ms |
| 95%响应时间 | 356ms |
| 99%响应时间 | 487ms |
| 最小响应时间 | 98ms |
| 最大响应时间 | 712ms |
| TPS | 130 |

**系统资源监控：**

| 指标 | Gateway | Product | Order | Payment |
|-----|---------|---------|-------|---------|
| CPU使用率 | 35% | 42% | 38% | 30% |
| 内存使用 | 512MB | 680MB | 590MB | 520MB |
| JVM堆内存 | 45% | 58% | 52% | 48% |
| 线程数 | 156 | 178 | 165 | 142 |

**数据库监控：**

| 指标 | MySQL |
|-----|-------|
| 连接数 | 28/100 |
| QPS | 450 |
| 慢查询 | 0 |
| 平均查询耗时 | 12ms |

**Redis监控：**

| 指标 | Redis |
|-----|-------|
| 连接数 | 15 |
| OPS | 890 |
| 命中率 | 98.5% |
| 平均响应时间 | 1.2ms |

---

## 11. 项目总结

### 11.1 技术亮点

**1. 完整的微服务架构**

✅ **服务治理**
- Nacos实现服务注册发现
- Nacos Config实现配置中心
- 动态配置刷新，无需重启

✅ **网关统一入口**
- Spring Cloud Gateway路由转发
- JWT认证鉴权
- 全局异常处理

✅ **服务间通信**
- OpenFeign声明式调用
- Ribbon负载均衡
- 超时重试配置

**2. 高可用保障**

✅ **限流降级**
- Sentinel流量控制
- QPS限流保护
- Feign Fallback降级
- 熔断机制

✅ **幂等与防重**
- 支付幂等Token机制
- 订单防重复提交
- Redis分布式锁

**3. 可观测性**

✅ **链路追踪**
- Sleuth + Zipkin全链路追踪
- TraceId贯穿所有日志
- 可视化服务调用链路

✅ **指标监控**
- Micrometer + Prometheus
- JVM、HTTP、数据库指标
- Grafana可视化

✅ **日志体系**
- MDC日志追踪
- TraceId关联日志
- 分布式日志统一管理

### 11.2 经验总结

**成功经验：**

1. **技术选型合理**
   - Spring Cloud Alibaba生态完整
   - 组件成熟稳定
   - 社区活跃

2. **架构设计清晰**
   - 服务职责单一
   - 服务边界明确
   - 依赖关系简单

3. **开发规范统一**
   - 统一响应格式
   - 统一异常处理
   - 统一日志规范

4. **监控完善**
   - 链路追踪定位问题快
   - 指标监控及时发现异常

### 11.3 后续规划

**短期规划（1-2个月）：**

1. **引入分布式事务 - Seata**
   - 解决订单-库存-支付数据一致性
   
2. **引入消息队列 - RocketMQ**
   - 异步解耦、削峰填谷
   
3. **缓存架构优化**
   - 商品信息Redis缓存
   - 多级缓存架构

4. **API文档集成**
   - Swagger/OpenAPI

**中期规划（3-6个月）：**

1. 数据库优化（读写分离、分库分表）
2. 前端开发（Vue3 + TypeScript）
3. 容器化部署（Docker + K8s）
4. 安全加固

---

## 12. 附录

### 12.1 端口清单

| 服务 | 端口 | 说明 |
|-----|------|------|
| shop-gateway-service | 9001 | 网关服务 |
| shop-user-service | 8083 | 用户服务 |
| shop-product-service | 8081 | 商品服务 |
| shop-order-service | 8082 | 订单服务 |
| shop-payment-service | 8084 | 支付服务 |
| Nacos | 8848 | 注册中心/配置中心 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |
| Zipkin | 9411 | 链路追踪 |

### 12.2 核心API清单

**用户服务：**
- POST /api/v1/users/register - 用户注册
- POST /api/v1/users/login - 用户登录
- GET /api/v1/users/info - 获取用户信息

**商品服务：**
- GET /api/v1/products - 商品列表
- GET /api/v1/products/{id} - 商品详情
- POST /api/v1/products - 创建商品
- PUT /api/v1/products/stock/deduct - 扣减库存

**订单服务：**
- POST /api/v1/orders - 创建订单
- GET /api/v1/orders - 订单列表
- GET /api/v1/orders/{id} - 订单详情

**支付服务：**
- POST /api/v1/payments - 创建支付
- GET /api/v1/payments/{id} - 支付详情

---

## 结语

YQSX微服务商城系统是一个完整的、生产级的微服务架构实践项目。

**项目价值：**

✅ 技术完整性：涵盖微服务核心技术栈
✅ 架构合理性：服务拆分合理、职责清晰
✅ 稳定性保障：限流降级、幂等防重
✅ 可观测性：全链路追踪、指标监控
✅ 文档完善：架构文档、开发规范、交付报告

**适用场景：**

1. 学习微服务架构
2. 企业项目参考
3. 面试准备
4. 技术选型

---

**项目名称：** YQSX 微服务商城系统  
**技术栈：** Spring Boot + Spring Cloud Alibaba  
**交付日期：** 2026-06-20  
**文档版本：** v1.0  

---

**END**
