# 系统架构文档

## 项目概述

本项目是基于Spring Cloud Alibaba微服务架构的企业级商城系统，集成YOLO图像识别能力，实现智能商品识别与订单管理。

## 技术架构

### 架构模式

```
分层架构 + 微服务架构 + 前后端分离
```

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (Vue3)                        │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  管理后台  │  │  用户端   │  │  移动端   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────┐
│                    网关层 (Gateway)                       │
│                                                           │
│  - 路由转发                                               │
│  - 认证鉴权 (Sa-Token)                                    │
│  - 限流熔断 (Sentinel)                                    │
│  - 日志追踪                                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 服务层 (Microservices)                    │
│                                                           │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐          │
│  │ 商品服务   │  │ 订单服务   │  │  用户服务   │          │
│  │ (Product) │  │  (Order)  │  │   (User)   │          │
│  └───────────┘  └───────────┘  └────────────┘          │
│                                                           │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐          │
│  │ 支付服务   │  │ 图像识别   │  │  消息服务   │          │
│  │ (Payment) │  │  (YOLO)   │  │ (Message)  │          │
│  └───────────┘  └───────────┘  └────────────┘          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              基础设施层 (Infrastructure)                  │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Nacos   │  │  MySQL   │  │  Redis   │              │
│  │ (注册中心) │  │ (数据库)  │  │ (缓存)   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Sentinel │  │  Seata   │  │ RocketMQ │              │
│  │ (限流)    │  │ (分布式事务)│ │ (消息队列) │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

## 技术栈详情

### 后端技术栈

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Spring Boot | 2.3.2.RELEASE | 微服务框架 |
| Spring Cloud | Hoxton.SR8 | 微服务治理 |
| Spring Cloud Alibaba | 2.2.3.RELEASE | 微服务组件 |
| MyBatis Plus | 3.x | ORM框架 |
| Sa-Token | 最新版 | 认证授权 |
| MySQL | 8.0+ | 关系数据库 |
| Redis | 6.0+ | 缓存数据库 |
| Nacos | 2.x | 注册中心/配置中心 |
| Sentinel | 1.8+ | 流量控制 |
| Seata | 1.4+ | 分布式事务 |
| RocketMQ | 4.9+ | 消息队列 |
| FastAPI | 最新版 | Python微服务框架 |
| PyTorch | 最新版 | 深度学习框架 |
| YOLOv11 | 最新版 | 目标检测模型 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Vue | 3.x | 前端框架 |
| TypeScript | 5.x | 类型系统 |
| Vite | 5.x | 构建工具 |
| Pinia | 2.x | 状态管理 |
| Vue Router | 4.x | 路由管理 |
| Element Plus | 2.x | UI组件库 |
| Axios | 1.x | HTTP客户端 |
| Echarts | 5.x | 数据可视化 |

### 开发工具

| 工具 | 用途 |
|-----|-----|
| Maven | Java项目构建 |
| Git | 版本控制 |
| JMeter | 性能测试 |
| Docker | 容器化部署 |
| Jenkins | CI/CD |
| Navicat | 数据库管理 |

## 核心模块架构

### 1. 商品服务 (shop-product-server)

**职责**：
- 商品信息管理
- 商品库存管理
- 商品分类管理
- 商品搜索

**端口**：8081

**数据库**：shop-product

**主要接口**：
- GET /product/list - 商品列表
- GET /product/{id} - 商品详情
- POST /product/add - 添加商品
- PUT /product/update - 更新商品
- DELETE /product/delete/{id} - 删除商品
- PUT /product/stock/deduct - 扣减库存

### 2. 订单服务 (shop-order-server)

**职责**：
- 订单创建
- 订单支付
- 订单状态管理
- 订单查询

**端口**：8082

**数据库**：shop-order

**主要接口**：
- POST /order/create - 创建订单
- GET /order/list - 订单列表
- GET /order/{id} - 订单详情
- PUT /order/pay - 支付订单
- PUT /order/cancel - 取消订单

### 3. YOLO识别服务 (recognition-service)

**职责**：
- 商品图像识别
- 模型推理
- 识别结果返回

**端口**：8086

**技术栈**：Python + FastAPI + PyTorch + YOLOv11

**主要接口**：
- POST /api/recognize - 图像识别

## 服务间通信

### 同步通信 - OpenFeign

```java
@FeignClient(name = "shop-product-service")
public interface IProductFeignService {
    @GetMapping("/product/{id}")
    Product getProductById(@PathVariable Long id);
}
```

### 异步通信 - RocketMQ

**使用场景**：
- 订单创建后发送通知
- 库存变更消息
- 数据同步

## 数据库设计原则

### 数据库隔离

每个微服务独立数据库：
- shop-product：商品数据
- shop-order：订单数据
- shop-user：用户数据
- shop-payment：支付数据

### 分库分表策略

**水平分表**：
- 订单表按时间分表（按月）
- 大表按ID取模分表

**垂直分库**：
- 核心业务库
- 日志库
- 报表库

## 缓存架构

### 缓存层次

```
L1: 本地缓存 (Caffeine)
     ↓ miss
L2: 分布式缓存 (Redis)
     ↓ miss
L3: 数据库 (MySQL)
```

### 缓存策略

**商品信息**：
- 缓存时间：30分钟
- 更新策略：Cache Aside Pattern
- 预热策略：启动时加载热点数据

**用户Session**：
- 存储：Redis
- 过期时间：2小时
- 续期策略：滑动窗口

## 安全架构

### 认证授权 - Sa-Token

**认证流程**：
```
1. 用户登录 → 生成Token
2. Token存储Redis
3. 请求携带Token
4. Gateway验证Token
5. 放行/拒绝
```

**权限模型**：RBAC（详见 rbac.md）

### 数据安全

- 敏感数据加密存储
- HTTPS传输
- SQL注入防护
- XSS防护
- CSRF防护

## 限流熔断 - Sentinel

### 限流规则

**QPS限流**：
- 商品详情：1000/s
- 订单创建：500/s
- 支付接口：100/s

**热点参数限流**：
- 热门商品单独限流

### 熔断规则

**慢调用比例**：
- RT > 200ms
- 比例 > 50%
- 熔断时长：10s

**异常比例**：
- 异常比例 > 30%
- 熔断时长：10s

## 分布式事务 - Seata

### 事务模式

**AT模式**（推荐）：
- 订单创建 + 库存扣减
- 自动回滚

**TCC模式**：
- 支付场景
- 手动补偿

### 事务组

```
@GlobalTransactional
public void createOrder(OrderDTO orderDTO) {
    // 1. 创建订单
    orderMapper.insert(order);
    
    // 2. 扣减库存（远程调用）
    productService.deductStock(productId, number);
    
    // 3. 扣减余额（远程调用）
    userService.deductBalance(userId, amount);
}
```

## 链路追踪 - Sleuth + Zipkin

### 追踪标识

- TraceId：全链路唯一ID
- SpanId：单次调用ID
- ParentSpanId：父调用ID

### 采样率

- 开发环境：100%
- 生产环境：10%

## 日志架构

### 日志级别

- ERROR：错误日志
- WARN：警告日志
- INFO：业务日志
- DEBUG：调试日志（生产关闭）

### 日志格式

```
[时间] [TraceId] [SpanId] [级别] [类名] - 日志内容
```

### 日志收集

```
应用日志 → Logback → 文件 → Filebeat → Elasticsearch → Kibana
```

## 监控体系

### 指标监控 - Prometheus + Grafana

**系统指标**：
- CPU使用率
- 内存使用率
- 磁盘IO
- 网络流量

**应用指标**：
- QPS/TPS
- 响应时间
- 错误率
- 调用链路

### 健康检查

**Actuator端点**：
- /actuator/health
- /actuator/metrics
- /actuator/info

**检查频率**：30秒/次

## 部署架构

### 容器化部署 - Docker

**镜像管理**：
- 基础镜像：Alpine + JDK11
- 应用镜像：基础镜像 + JAR
- 镜像仓库：Harbor

### 编排部署 - Kubernetes

**Pod配置**：
```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

**副本数**：
- 商品服务：3副本
- 订单服务：3副本
- 其他服务：2副本

### 持续集成 - Jenkins

**流水线**：
```
代码提交 → 编译 → 单元测试 → 构建镜像 → 推送仓库 → 部署K8s → 健康检查
```

## 性能优化

### JVM优化

```bash
-Xms2g -Xmx2g
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:+HeapDumpOnOutOfMemoryError
```

### 数据库优化

- 索引优化
- SQL优化
- 读写分离
- 连接池优化

### 缓存优化

- 多级缓存
- 缓存预热
- 缓存更新策略
- 缓存穿透/击穿/雪崩防护

### 接口优化

- 异步处理
- 批量操作
- 分页查询
- 懒加载

## 灾备方案

### 数据备份

**MySQL备份**：
- 全量备份：每天凌晨2点
- 增量备份：每小时
- 保留周期：30天

**Redis备份**：
- RDB：每小时
- AOF：实时

### 服务降级

**降级策略**：
1. 关闭非核心功能
2. 返回降级数据
3. 限流保护核心接口

**降级开关**：
- Nacos配置中心动态配置
- 实时生效

## 扩展性设计

### 水平扩展

- 无状态服务设计
- 支持动态扩容
- 负载均衡

### 垂直扩展

- 服务拆分
- 数据库拆分
- 缓存拆分

## 开发规范

详见：
- [后端开发规范](backend-rules.md)
- [前端开发规范](frontend-rules.md)
- [数据库规范](database.md)
- [API规范](api-standard.md)

## 项目目录结构

```
YQSX/
├── Test/                          # 后端工作区
│   └── shop-parent/               # 微服务父项目
│       ├── shop-product-api/      # 商品服务API
│       ├── shop-product-server/   # 商品服务实现
│       ├── shop-order-api/        # 订单服务API
│       └── shop-order-server/     # 订单服务实现
│
├── XML/                           # 配置与环境
│   ├── apache-maven-3.8.6/        # Maven
│   ├── apache-jmeter-5.6.3/       # JMeter
│   ├── nacos/                     # Nacos
│   ├── sql/                       # SQL脚本
│   └── yolo_recognition_model/    # YOLO模型包
│       ├── models/                # 模型文件
│       ├── training/              # 训练脚本
│       ├── dataset/               # 数据集配置
│       └── recognition-service/   # 识别服务
│
├── 课件/                          # 学习资料
│   ├── Day_01 Nacos/
│   ├── Day_02(负载均衡)/
│   ├── Day_03(限流)/
│   ├── Day_04(网关)/
│   ├── Day_05(配置中心)/
│   └── Day_06(链路追踪)/
│
├── docs/                          # 项目文档
│   ├── architecture.md            # 架构文档（本文件）
│   ├── database.md                # 数据库文档
│   ├── api-standard.md            # API规范
│   ├── rbac.md                    # 权限模型
│   ├── code-generator.md          # 代码生成器
│   ├── frontend-rules.md          # 前端规范
│   ├── backend-rules.md           # 后端规范
│   ├── project-rules.md           # 项目规则
│   └── agent-workflow.md          # Agent工作流
│
└── CLAUDE.md                      # 项目根文档
```

## 注意事项

1. **微服务拆分**：按业务领域拆分，保持服务独立性
2. **数据一致性**：使用分布式事务或最终一致性
3. **服务治理**：合理配置限流、熔断、降级策略
4. **监控告警**：建立完善的监控告警机制
5. **文档维护**：及时更新架构文档

## 未来规划

1. **服务网格**：引入Istio
2. **无服务器**：部分功能Serverless化
3. **AI增强**：更多AI能力集成
4. **多云部署**：支持多云环境部署
