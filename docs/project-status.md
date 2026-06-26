# 企业级商城系统 - 项目状态报告

## 一、当前完成度

### 1.1 整体完成度

| 模块 | 完成度 | 状态 |
|-----|--------|------|
| 商品服务 | 85% | ✅ 基本完成 |
| 订单服务 | 80% | ✅ 基本完成 |
| 用户服务 | 70% | ✅ 基本完成 |
| 支付服务 | 75% | ✅ 基本完成 |
| 图像识别服务 | 90% | ✅ 基本完成 |
| 认证授权 | 70% | ✅ 基本完成 |
| 网关服务 | 80% | ✅ 基本完成 |
| 前端 | 75% | ✅ 基本完成 |
| 文档 | 95% | ✅ 基本完成 |

**综合完成度：80%**

### 1.2 各模块详细完成度

#### 商品服务 (shop-product-server)

| 功能 | 状态 | 说明 |
|-----|------|-----|
| 商品查询(单条) | ✅ 完成 | `/products/{pid}` |
| 商品列表 | ⚠️ 基础完成 | 现有数据可查询，分页待完善 |
| 商品新增 | ⚠️ 基础完成 | 通过 SQL 初始化 |
| 商品修改 | ❌ 未开发 | 更新商品信息 |
| 商品删除 | ❌ 未开发 | 逻辑删除 |
| 库存扣减 | ⚠️ 部分完成 | 订单服务调用扣减 |
| 分类管理 | ✅ 完成 | `t_product_category` 19 类零食 |
| 拍照识别 | ✅ 完成 | `/products/recognize` |
| AI 推荐 | ✅ 完成 | `/products/recommend` |
| 识别日志 | ✅ 完成 | `t_recognition_log` |
| 识别 DTO 补全 | ✅ 完成 | `DetectionDto` / `ImageDimensionsDto` / `BoundingBoxDto` |

#### 订单服务 (shop-order-server)

| 功能 | 状态 | 说明 |
|-----|------|-----|
| 订单创建 | ✅ 完成 | `/orders/save` |
| 订单列表 | ✅ 完成 | `/orders/list/{uid}` |
| 订单详情 | ✅ 完成 | `/orders/{id}` |
| 订单状态默认值 | ✅ 修复 | `t_order.status` NOT NULL DEFAULT 'WAIT_PAY' |
| 订单支付 | ⚠️ 间接完成 | 由 Payment 服务调用 updateStatus |
| 订单取消 | ❌ 未开发 | 取消订单 |
| Sentinel限流 | ✅ 完成 | 流控、降级、热点、授权规则演示 |
| Feign远程调用 | ✅ 完成 | 调用商品服务 |
| 熔断降级 | ✅ 完成 | Feign Fallback兜底 |
| Redis 分布式锁 | ✅ 完成 | 防重复下单 |
| 乐观锁 | ✅ 完成 | version 字段 |

#### 用户服务 (shop-user-server)

| 功能 | 状态 | 说明 |
|-----|------|-----|
| 用户登录 | ✅ 完成 | `/user/login`，JWT Token |
| 用户信息 | ✅ 完成 | `/user/current` |
| 用户注册 | ❌ 未开发 | 注册接口 |
| 用户权限管理 | ⚠️ 部分完成 | Gateway JWT 认证 |
| 余额管理 | ❌ 未开发 | 余额扣减 |
| 积分管理 | ❌ 未开发 | 积分系统 |

#### 支付服务 (shop-payment-server)

| 功能 | 状态 | 说明 |
|-----|------|-----|
| 订单支付 | ✅ 完成 | `/payment/pay` |
| 支付回调 | ❌ 未开发 | 第三方支付回调 |
| 退款处理 | ❌ 未开发 | 退款接口 |
| 支付记录查询 | ❌ 未开发 | 支付流水 |
| Redis 分布式锁 | ✅ 完成 | 防重复支付 |
| 业务指标 | ✅ 完成 | `payment_success_total`、`order_pay_latency` |

#### 图像识别服务 (recognition-service)

| 功能 | 状态 | 说明 |
|-----|------|-----|
| YOLOv11 模型推理 | ✅ 完成 | `/api/recognition/v1/recognize/image` |
| Nacos 服务注册 | ✅ 完成 | `shop-recognition-service` |
| 数据库 ORM | ✅ 完成 | SQLAlchemy 2.0 |
| 识别日志持久化 | ✅ 完成 | `t_recognition_log` |
| 健康检查 | ✅ 完成 | `/health` |
| 19 类零食识别 | ✅ 完成 | 与 `t_product_category` 表中的 19 类零食对齐 |
| 中文类别名称映射 | ✅ 完成 | Python `yolo_engine.py` + 前端 `category-mapping.ts` |
| GPU 加速 | ⚠️ 待优化 | 当前 CPU 模式 |

---

## 二、系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    前端层 (Next.js 16)                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  管理后台  │  │  用户端   │  │  拍照识别  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    网关层 (Gateway)                         │
│                                                             │
│  - 路由转发                                                  │
│  - 认证鉴权 (JWT)                                           │
│  - 限流熔断 (Sentinel)                                       │
│  - 日志追踪 (Sleuth+Zipkin)                                  │
│  - Prometheus 指标暴露                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 服务层 (Microservices)                       │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐              │
│  │ 商品服务   │  │ 订单服务   │  │  用户服务   │              │
│  │ (Product) │  │  (Order)  │  │   (User)   │              │
│  │ ✅80%      │  │ ✅75%     │  │   ✅70%    │              │
│  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘              │
│        │              │              │                      │
│        │    ┌─────────┴─────────┐    │                      │
│        │    │    OpenFeign      │    │                      │
│        │    ↓                   │    │                      │
│  ┌─────┴────┐            ┌─────┴────┐│                      │
│  │ 图像识别   │            │  支付服务  ││                      │
│  │ (YOLO)   │            │ (Payment)││                      │
│  │ ✅85%    │            │  ✅75%   ││                      │
│  └──────────┘            └──────────┘│                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              基础设施层 (Infrastructure)                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Nacos   │  │  MySQL   │  │  Redis   │                 │
│  │ (注册/配置)│  │ (数据库)  │  │ (缓存/锁) │                 │
│  │ ✅已部署  │  │ ✅已部署  │  │   ✅已部署 │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Sentinel │  │  Zipkin  │  │ Prometheus│                 │
│  │ (限流)    │  │ (链路追踪)│ │ (指标采集) │                 │
│  │ ✅已部署  │  │   ✅已部署 │  │   ✅已部署 │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、微服务关系图

```
                     ┌──────────────┐
                     │   Gateway    │
                     │    ✅8080    │
                     └──────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ↓                 ↓                 ↓
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │  用户服务  │    │  订单服务  │    │  商品服务  │
   │   User    │    │   Order   │    │  Product  │
   │ ✅8083    │    │  ✅8091   │    │  ✅8081   │
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
         │                │                │
         │                ├────────────────┤
         │                │   OpenFeign    │
         │                ↓                │
         │    ┌───────────────────┐        │
         └───→│   支付服务        │←───────┘
              │    Payment       │   Feign
              │   ✅8084         │
              └──────────────────┘
                     │
                     ↓
              ┌───────────────┐
              │  消息服务      │
              │   Message     │
              │    ❌0%       │
              └───────────────┘

   ┌─────────────────────────────────────────┐
   │            图像识别服务                   │
   │          Recognition (YOLO)              │
   │          ✅8086 已注册Nacos             │
   │                                         │
   │  独立Python服务，通过Feign/REST API调用  │
   │  模型: YOLOv11, 19类零食识别             │
   └─────────────────────────────────────────┘
```

**服务通信关系说明：**

| 服务 | 端口 | 依赖服务 | 通信方式 | 状态 |
|-----|------|---------|---------|------|
| shop-gateway-service | 8080 | 所有服务 | 路由转发 | ✅ 运行中 |
| shop-user-service | 8083 | 无 | 被调用方 | ✅ 运行中 |
| shop-product-service | 8081 | shop-recognition-service | OpenFeign/REST | ✅ 运行中 |
| shop-order-service | 8091 | shop-product-service | OpenFeign | ✅ 运行中 |
| shop-payment-service | 8084 | shop-order-service | OpenFeign | ✅ 运行中 |
| shop-recognition-service | 8086 | 无 | REST API | ✅ 运行中 |

---

## 四、数据库关系图

```
shop-product库
────────────────
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ t_product        │     │ t_product_category│     │ t_recognition_log │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │────►│ id (PK)          │◄────│ id (PK)          │
│ name             │ FK  │ display_name     │ FK  │ request_id (UQ)  │
│ price            │     │ sort_order       │     │ status           │
│ stock            │     │ status           │     │ processing_time_ms│
│ category_id (FK) │     │ create_time      │     │ error_msg        │
│ image_url        │     │ update_time      │     │ detection_result_json│
│ sales            │     │                  │     │ recommend_product_ids│
│ create_time      │     │                  │     │ create_time      │
│ update_time      │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘

shop-order库                          shop-user库
───────────────                        ──────────────
┌────────────┐                        ┌────────────┐
│   t_order  │                        │   t_user   │
├────────────┤                        ├────────────┤
│ id (PK)    │                        │ id (PK)    │
│ pid        │───┐                    │ username   │
│ uid        │   │                    │ password   │
│ username   │   │                    │ ...        │
│ product_   │   │                    └────────────┘
│  name      │   │
│ status     │   │
│ version    │   │
└────────────┘   │
                 ↓
            ┌────────────┐
            │t_order_item│
            ├────────────┤
            │ id (PK)    │
            │ order_id   │
            │ product_id │
            │ ...        │
            └────────────┘

shop-payment库
───────────────
┌────────────┐
│ t_payment  │
├────────────┤
│ id (PK)    │
│ order_id   │
│ amount     │
│ pay_type   │
│ status     │
└────────────┘
```

**数据库设计规范：**

| 数据库 | 用途 | 表数量 | 状态 |
|-------|------|--------|------|
| shop-product | 商品数据 | 3 | ✅ 已创建 |
| shop-order | 订单数据 | 2 | ✅ 已创建 |
| shop-user | 用户数据 | 1+ | ✅ 已创建 |
| shop-payment | 支付数据 | 1+ | ✅ 已创建 |
| shop-inventory | 库存数据 | 0 | ❌ 未创建 |

---

## 五、已完成模块

### 5.1 后端模块

#### 1. 商品服务 (shop-product-server)

**完成内容：**
- Spring Boot 启动类配置，启用 Nacos 服务发现
- 商品实体类 `Product` (id, name, price, stock, category_id, image_url, sales, version)
- 商品分类实体 `ProductCategory` (19 类零食)
- 识别响应 VO `RecognitionResponseVo`
- 商品 Mapper 接口，继承 MyBatis Plus BaseMapper
- 商品 Service 接口，实现识别、推荐逻辑
- 商品 Controller，提供商品查询、识别、推荐接口
- Feign 客户端 `RecognitionFeignClient` 调用 Python 识别服务
- Feign 降级兜底 `RecognitionFeignFallback`
- Sentinel 注解限流
- 数据库连接配置 (application.yml + bootstrap.yml)

**文件列表：**
- `ProductServer.java` - 启动类
- `Product.java` / `ProductCategory.java` - 实体类
- `ProductMapper.java` - 数据访问层
- `ProductService.java` / `ProductServiceImpl.java` - 服务层
- `ProductController.java` - 控制器
- `RecognitionFeignClient.java` - Feign 客户端
- `RecognitionFeignFallback.java` - 降级兜底
- `RecognitionResultDto.java` / `DetectionDto.java` - DTO
- `RecognitionResponseVo.java` - VO
- `application.yml` / `bootstrap.yml` - 配置文件

#### 2. 订单服务 (shop-order-server)

**完成内容：**
- Spring Boot 启动类配置，启用 Nacos、Feign、负载均衡
- 订单实体类 `Order` (含 version 乐观锁)
- 用户实体类 `User`
- 订单 Mapper 接口
- 订单 Service，实现 createOrder
- 订单 Controller，提供 `/orders/save`、`/orders/{id}`、`/orders/updateStatus`
- Feign 客户端（商品服务）
- Feign 降级兜底类
- Sentinel 演示控制器
- Redis 分布式锁防重复下单
- 全链路 trace 模式 (`app.trace.full-chain`)
- 业务指标 `order_create_total`

#### 3. 用户服务 (shop-user-server)

**完成内容：**
- Spring Boot 启动类配置
- JWT 工具类 `JwtUtil`
- 用户 Controller：`/user/login`、`/user/current`、`/user/hello`
- Sentinel 限流

#### 4. 支付服务 (shop-payment-server)

**完成内容：**
- Spring Boot 启动类配置
- 支付 Controller：`/payment/pay`、`/payment/hello`
- OrderFeignClient 调用订单服务
- Redis 分布式锁防重复支付
- 订单状态机校验 (WAIT_PAY → PAID)
- Micrometer 指标 `payment_success_total`、`order_pay_latency`

#### 5. 网关服务 (shop-gateway-server)

**完成内容：**
- Spring Cloud Gateway 启动类
- 路由配置：user、product、order、payment
- JWT 认证过滤器 `AuthFilter`
- 白名单机制 `/api/user/login`、`/api/user/hello`
- X-User-Id 透传
- 503 fallback 提示
- Sentinel 集成
- @RefreshScope 动态配置刷新

#### 6. 图像识别服务 (recognition-service)

**完成内容：**
- FastAPI 启动类
- YOLOv11 模型加载与推理
- `/api/recognition/v1/recognize/image` 接口
- `/health` 健康检查
- Nacos 注册中心接入（自实现 HTTP 注册/心跳/注销）
- SQLAlchemy 2.0 ORM：`ProductCategory`、`Product`、`RecognitionLog`
- 识别日志持久化到 `t_recognition_log`
- 中文类别名称映射，输出中文展示名称
- 环境变量配置：MODEL_PATH、DATABASE_URL、NACOS_* 等

#### 7. 前端 (shop-web-next)

**完成内容：**
- Next.js 16 + React 19 + TypeScript + Tailwind CSS
- Zustand 状态管理 + 中间件 Cookie/localStorage 同步
- 登录页面 (`/login`)
- 商品列表页面 (`/products`) 与分类筛选
- 商品详情页面 (`/products/[id]`)
- 拍照识别页面 (`/recognize`)
- 订单列表页面 (`/orders`) 与订单详情页面 (`/orders/[id]`)
- 对接后端统一入口 `/api/**`
- 修复 Next.js hydration 报错

### 5.2 数据库脚本

**完成内容：**
- 商品数据库初始化脚本 (`shop-product-ai.sql`)
- 订单数据库初始化脚本 (`shop-order.sql`)
- 用户数据库初始化脚本
- 支付数据库初始化脚本
- 19 类零食商品数据
- 外键约束
- 识别日志表

### 5.3 可观测性

**完成内容：**
- Zipkin Server 链路追踪
- Sleuth 100% 采样率
- MDC traceId/spanId 日志注入
- Prometheus 指标采集
- Grafana 仪表盘：QPS、RT、Error Rate、JVM Memory、Business Metrics

---

## 六、待开发模块

### 6.1 后端模块

#### 1. 用户服务增强

**待开发功能：**
- 用户注册
- 密码加密存储
- 余额管理
- 积分管理
- 真实用户表与数据库交互

#### 2. 支付服务增强

**待开发功能：**
- 支付记录持久化
- 第三方支付对接（模拟/真实）
- 退款处理
- 支付流水查询

#### 3. 消息服务 (shop-message-server)

**待开发功能：**
- 订单通知
- 库存变更消息
- 数据同步

#### 4. 库存服务 (shop-inventory-server)

**待开发功能：**
- 独立库存管理
- 库存预占/释放
- 与订单服务事务一致性

### 6.2 前端模块

**已完成页面：**
- 登录页面 (`/login`)
- 商品列表页面 (`/products`)
- 商品详情页面 (`/products/[id]`)
- 拍照识别页面 (`/recognize`)
- 订单列表页面 (`/orders`)
- 订单详情页面 (`/orders/[id]`)

**待优化/待开发：**
- 用户中心页面
- 管理后台页面
- 商品图片完整路径处理
- 订单列表分页
- 订单取消功能

**技术栈：** Next.js 16 + React 19 + TypeScript + Tailwind CSS + Zustand

### 6.3 基础设施增强

**待开发内容：**
- Seata 分布式事务配置
- RocketMQ 消息队列配置
- 生产级缓存策略
- 容器化部署 (Docker/K8s)

---

## 七、开发路线图

### P0 - 核心功能（已基本完成）

| 序号 | 任务 | 优先级 | 状态 |
|-----|------|--------|------|
| 1 | 用户服务 - 登录/注册 | P0 | ✅ 完成 |
| 2 | 商品服务 - CRUD/分类/识别 | P0 | ✅ 完成 |
| 3 | 订单服务 - 创建/查询/状态流转 | P0 | ✅ 完成 |
| 4 | 支付服务 - 基础支付 | P0 | ✅ 完成 |
| 5 | 网关服务 - 路由/认证/限流 | P0 | ✅ 完成 |
| 6 | 图像识别服务 - YOLO集成 | P0 | ✅ 完成 |
| 7 | 数据库 - 用户/支付/订单表结构 | P0 | ✅ 完成 |

### P1 - 增强功能（重要）

| 序号 | 任务 | 优先级 | 状态 |
|-----|------|--------|------|
| 1 | 前端 - 商品列表/详情页面 | P1 | ✅ 已完成 |
| 2 | 前端 - 拍照识别/推荐页面 | P1 | ✅ 已完成 |
| 3 | 前端 - 订单管理页面 | P1 | ✅ 已完成 |
| 4 | 前端 - 用户中心页面 | P1 | ⚠️ 未开始 |
| 5 | 用户服务 - 注册/余额/积分 | P1 | ❌ 未开始 |
| 6 | 支付服务 - 支付记录/退款 | P1 | ❌ 未开始 |
| 7 | 消息服务 - 订单通知 | P1 | ❌ 未开始 |
| 8 | 库存服务 - 独立库存管理 | P1 | ❌ 未开始 |

### P2 - 优化完善（可选）

| 序号 | 任务 | 优先级 | 状态 |
|-----|------|--------|------|
| 1 | 前端 - 管理后台 | P2 | ❌ 未开始 |
| 2 | 前端 - 移动端适配 | P2 | ❌ 未开始 |
| 3 | Seata 分布式事务 | P2 | ❌ 未开始 |
| 4 | RocketMQ 消息队列 | P2 | ❌ 未开始 |
| 5 | Docker 容器化部署 | P2 | ❌ 未开始 |
| 6 | Kubernetes 编排 | P2 | ❌ 未开始 |
| 7 | YOLO 模型 GPU 加速 | P2 | ⚠️ 待优化 |
| 8 | 识别类别中文名称映射 | P2 | ✅ 已完成 |

---

## 八、风险分析

### 8.1 技术风险

| 风险 | 概率 | 影响 | 应对措施 |
|-----|------|------|---------|
| YOLO 类别名称为 `class_X`，可读性差 | 高 | 中 | ✅ 已增加 class_id → 中文名称映射 |
| CPU 推理性能不足 | 中 | 中 | 生产环境切换 GPU |
| 登录接口使用 `@RequestParam` | 中 | 低 | 与前端对齐调用方式（已文档化） |
| Seata 分布式事务配置复杂 | 中 | 高 | 需要时引入 AT 模式 |

### 8.2 进度风险

| 风险 | 概率 | 影响 | 应对措施 |
|-----|------|------|---------|
| 前端核心页面已完成，剩余管理后台/用户中心 | 低 | 中 | 按需补充 |
| 第三方支付对接复杂 | 低 | 中 | 先使用模拟支付 |

### 8.3 资源风险

| 风险 | 概率 | 影响 | 应对措施 |
|-----|------|------|---------|
| GPU 资源不足 | 中 | 中 | CPU 模式兜底 |
| 测试环境不稳定 | 低 | 中 | 使用脚本统一启动 |

---

## 九、技术债分析

### 9.1 代码规范偏差

| 问题 | 位置 | 影响 | 修复建议 |
|-----|------|------|---------|
| 登录接口使用 `@RequestParam` | UserController | 与 REST 习惯不一致 | ✅ 已改为 `@RequestBody LoginDTO` |
| User 服务未连接真实用户表 | UserController | 仅硬编码 admin | 增加 UserMapper 和数据库查询 |
| 支付记录未持久化 | PaymentController | 无法追溯 | 增加 Payment 表和 Service |
| 商品列表分页待完善 | ProductService | 性能隐患 | 完善分页查询 |
| 订单状态存在历史 `CREATED` 值 | t_order | 前端显示异常 | ✅ 已修正为 `WAIT_PAY` 并设置 NOT NULL DEFAULT |

### 9.2 架构设计偏差

| 问题 | 位置 | 影响 | 修复建议 |
|-----|------|------|---------|
| 缺少独立库存服务 | shop-inventory | 库存与商品耦合 | 拆分库存服务 |
| 缺少消息服务 | shop-message | 通知同步阻塞 | 引入 RocketMQ |
| YOLO 类别名称映射 | recognition-service | 前端展示不友好 | ✅ 已在 Python/JavaScript 双端完成映射 |

---

## 十、总结

### 10.1 项目状态

- **当前阶段**: 微服务核心框架、AI 识别能力与前端核心页面均已完成，端到端流程可完整运行
- **主要成果**:
  - 5 个 Java 微服务 + 1 个 Python 识别服务全部接入 Nacos 并运行
  - Gateway 统一入口 + JWT 认证 + Sentinel 限流
  - AI 拍照识别与商品推荐链路打通，识别结果展示中文名称
  - 可观测性体系（Zipkin、Prometheus、Grafana）已落地
  - Next.js 前端完成登录、商品、识别、订单等核心页面
- **核心差距**: 管理后台/用户中心、注册/余额/积分、支付记录/退款、消息服务待完善

### 10.2 下一步建议

1. **完善用户服务**：注册、真实用户表、余额/积分
2. **补充支付记录**：持久化支付流水、退款处理
3. **前端增强**：用户中心、管理后台、订单列表分页
4. **优化识别体验**：GPU 加速、推荐算法升级

### 10.3 预期完成时间

| 阶段 | 时间 | 里程碑 |
|-----|------|--------|
| P0 核心功能 | 已完成 | 微服务 + AI 识别链路可用 |
| P1 增强功能 | 2-3 周 | 前端可用 + 用户/支付增强 |
| P2 优化完善 | 4-6 周 | 生产环境就绪 |

---

---

## 十一、启动与部署问题记录

### 11.1 发现的问题

| 问题 | 根因 | 影响 | 当前状态 |
|------|------|------|---------|
| 文档中前端项目/端口与实际不符 | 前端已从 Vue 3 (`shop-web:5173`) 切换为 Next.js (`shop-web-next:3000`)，文档未同步 | 新人按文档执行会进错目录、用错端口 | ⚠️ 已记录，待逐步修正 |
| Grafana 端口 3000 与前端冲突 | 两者默认均使用 3000 | 同时启动时 Grafana 失败 | 已修复：Grafana 改用 3001 |
| `start_project.py` 识别服务硬失败 | 脚本在识别服务启动失败时直接退出 | 识别服务问题导致整个项目无法启动 | 已修复：改为可选启动 |
| `start_project.py` 未启动 Prometheus/Grafana/DIN | 脚本覆盖不全 | 可观测性与推荐能力需手动启动 | 已修复：脚本已补充 |
| YOLO `.env` 模型路径错误 | 配置漂移，指向不存在的 `yolo_training_outputs` | 识别服务 503 | 已修复：指向真实 `best.pt` |
| Windows 下 `Start-Process npm` 报错 | `npm` 是 `.cmd` 脚本，非 PE 可执行文件 | 前端无法通过 PowerShell 后台启动 | 已修复：改用 `cmd.exe /c` |

### 11.2 已应用修复

1. **识别服务 `.env`**：`MODEL_PATH` 已指向实际训练权重。
2. **`start_project.py`**：
   - 识别服务失败不阻塞主流程。
   - 增加 Prometheus、Grafana、DIN 推荐服务启动。
   - 修正 `npm` 启动方式。
   - conda 环境名增加 `AIDetection-service` / `AIDetection` 回退。
3. **Grafana 端口**：启动时固定为 `3001`。

### 11.3 待完善

- 统一修正 `README.md`、`implementation-guide.md`、`quick-reference.md` 中的 `shop-web` / `5173` 引用。
- 将 Prometheus / Grafana / DIN 服务纳入 `dist-pack/start.ps1`。
- 补充 `docs/startup-troubleshooting.md` 到知识库索引。

详见：[启动问题排查与运维指南](./startup-troubleshooting.md)

---

**报告生成时间**: 2026-06-20  
**项目版本**: 1.2.1  
**综合完成度**: 80%
