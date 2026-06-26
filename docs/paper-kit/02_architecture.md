# 系统架构设计

## 2.1 架构设计原则

### 2.1.1 单一职责原则

每个微服务负责单一业务领域，服务边界清晰，职责明确。商品服务专注商品管理，订单服务专注订单流程，AI服务专注模型推理，避免服务职责过重。

### 2.1.2 服务自治原则

- 每个服务独立部署、独立数据库
- 服务间松耦合、高内聚
- 跨服务数据同步通过Feign接口调用，禁止直接访问其他服务数据库

### 2.1.3 容错设计原则

- Sentinel限流降级保护核心服务
- 熔断机制防止服务雪崩
- Fallback降级方案保证用户体验

### 2.1.4 可观测性原则

- 全链路追踪（Zipkin）
- 指标监控（Prometheus+Grafana）
- 结构化日志（TraceId串联）

### 2.1.5 幂等性原则

- 支付操作幂等Token机制
- 订单创建分布式锁防重
- 接口支持安全重试

## 2.2 整体架构

系统采用**分层架构 + 微服务架构 + 前后端分离**的混合架构模式，整体分为四层：

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端展示层 (Frontend)                      │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │  Next.js 16  │  │  React 19    │  │  Tailwind CSS│          │
│   │  App Router  │  │  Components  │  │  shadcn/ui   │          │
│   │   :3000      │  │  Zustand     │  │  TypeScript  │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                      登录 | 首页 | 识别 | 订单 | 个人中心          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS / REST API
┌─────────────────────────────────────────────────────────────────┐
│                        网关层 (Gateway)                          │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Spring Cloud Gateway :8080                 │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│   │  │ 路由转发  │ │ JWT认证  │ │ 限流熔断  │ │ 日志追踪  │   │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ OpenFeign / HTTP
┌─────────────────────────────────────────────────────────────────┐
│                        业务服务层 (Microservices)                 │
│                                                                  │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│   │  商品服务    │ │  订单服务    │ │  用户服务    │              │
│   │  Product    │ │  Order      │ │  User       │              │
│   │  :8081      │ │  :8091      │ │  :8083      │              │
│   │  Spring Boot│ │  Spring Boot│ │  Spring Boot│              │
│   └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                  │
│   ┌─────────────┐                                               │
│   │  支付服务    │                                               │
│   │  Payment    │                                               │
│   │  :8084      │                                               │
│   │  Spring Boot│                                               │
│   └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP / gRPC
┌─────────────────────────────────────────────────────────────────┐
│                        AI 服务层 (AI Services)                    │
│                                                                  │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│   │ YOLO识别服务 │ │ DIN推荐服务  │ │ KBQA问答服务 │              │
│   │  YOLOv11    │ │ Deep Interest│ │ Neo4j + NLP │              │
│   │  FastAPI    │ │ Network     │ │ Flask API   │              │
│   │  :8086      │ │  :8000      │ │  :8087      │              │
│   │  PyTorch    │ │ TensorFlow  │ │  py2neo     │              │
│   └─────────────┘ └─────────────┘ └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      基础设施层 (Infrastructure)                   │
│                                                                  │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│   │ Nacos  │ │ MySQL  │ │ Redis  │ │Sentinel│ │ Zipkin │      │
│   │注册配置│ │ 数据存储│ │ 缓存锁 │ │ 限流熔断│ │链路追踪│      │
│   │ :8848  │ │ :3306  │ │ :6379  │ │        │ │ :9411  │      │
│   └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                                  │
│   ┌────────┐ ┌────────┐                                         │
│   │Prometheus│ │Grafana │                                         │
│   │ 指标采集│ │可视化  │                                         │
│   │ :9090  │ │ :3001  │                                         │
│   └────────┘ └────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

![系统架构图](assets/architecture.png)

## 2.3 技术选型

### 2.3.1 后端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Spring Boot | 2.3.2.RELEASE | 微服务基础框架 |
| Spring Cloud | Hoxton.SR8 | 微服务治理框架 |
| Spring Cloud Alibaba | 2.2.3.RELEASE | 阿里微服务组件 |
| Nacos | 2.x | 服务注册与配置中心 |
| Spring Cloud Gateway | 2.x | API网关 |
| OpenFeign | 2.x | 声明式HTTP客户端 |
| Sentinel | 1.8+ | 流量控制与熔断降级 |
| MyBatis Plus | 3.x | ORM框架 |
| MySQL | 8.0+ | 关系型数据库 |
| Redis | 6.0+ | 缓存与分布式锁 |
| Sleuth + Zipkin | 2.x | 分布式链路追踪 |
| Micrometer + Prometheus | 2.x | 指标采集 |
| JWT | - | 用户认证Token |

### 2.3.2 AI技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Python | 3.10+ | AI服务开发语言 |
| FastAPI | 0.108+ | YOLO识别Web框架 |
| Flask | 2.x+ | DIN推荐/KBQA Web框架 |
| PyTorch | 2.1+ | YOLO深度学习框架 |
| TensorFlow/Keras | 2.x | DIN推荐模型框架 |
| Ultralytics YOLO | 8.0+ | YOLOv11模型库 |
| Neo4j | 5.x+ | 知识图谱数据库 |
| py2neo | 2021.x | Neo4j Python驱动 |
| scikit-learn | 1.x+ | 机器学习工具 |
| pandas | 2.x+ | 数据处理 |
| numpy | 1.x+ | 数值计算 |

### 2.3.3 前端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Next.js | 16+ | React全栈框架 |
| React | 19+ | 前端UI框架 |
| TypeScript | 5.0+ | 类型系统 |
| Tailwind CSS | 4+ | CSS原子化框架 |
| shadcn/ui | 最新 | UI组件库 |
| Zustand | 5+ | 状态管理 |
| Axios | 1.6+ | HTTP客户端 |
| Next.js App Router | - | 路由方案 |

## 2.4 服务划分与端口

| 服务名称 | 服务代码 | 端口 | 技术栈 | 数据库 | 职责 |
|---------|---------|------|-------|-------|------|
| 网关服务 | shop-gateway-server | 8080 | Spring Cloud Gateway | - | 路由转发、认证鉴权、限流 |
| 商品服务 | shop-product-server | 8081 | Spring Boot | shop-product | 商品CRUD、库存管理、AI识别对接 |
| 订单服务 | shop-order-server | 8091 | Spring Boot | shop-order | 订单创建、状态管理、防重 |
| 用户服务 | shop-user-server | 8083 | Spring Boot | shop-user | 用户注册登录、JWT认证 |
| 支付服务 | shop-payment-server | 8084 | Spring Boot | shop-payment | 支付处理、幂等保证、回调 |
| YOLO识别 | recognition-service | 8086 | FastAPI + PyTorch | - | 图像识别、商品匹配 |
| DIN推荐 | din-service | 8000 | Flask + TensorFlow | - | 个性化推荐、缓存管理 |
| KBQA问答 | kbqa-service | 8087 | Flask + Neo4j | Neo4j | 知识图谱问答 |
| 前端应用 | shop-web-next | 3000 | Next.js 16 | - | 用户界面、交互逻辑 |
| Nacos | nacos | 8848 | Nacos Server | - | 注册中心、配置中心 |
| Zipkin | zipkin | 9411 | Zipkin Server | - | 链路追踪 |
| Prometheus | prometheus | 9090 | Prometheus | - | 指标采集 |
| Grafana | grafana | 3001 | Grafana | - | 监控可视化 |

## 2.5 服务间通信

### 2.5.1 同步通信 - OpenFeign

```java
@FeignClient(name = "shop-product-server", fallback = ProductFeignFallback.class)
public interface IProductFeignService {
    @GetMapping("/product/{id}")
    Result<ProductVO> getProductById(@PathVariable("id") Long id);
    
    @PutMapping("/product/stock/deduct")
    Result<Void> deductStock(@RequestParam("productId") Long productId, 
                             @RequestParam("quantity") Integer quantity);
}
```

**服务依赖关系：**
```
Gateway
  ├─→ User Service (独立)
  ├─→ Product Service (独立，对接YOLO服务)
  ├─→ Order Service → Product Service (扣库存)
  │                → Payment Service (创建支付)
  │                → DIN Service (获取推荐)
  └─→ Payment Service (独立)
```

### 2.5.2 AI服务通信 - REST HTTP

Java微服务通过REST Template或OkHttp调用Python AI服务：

```java
// 调用YOLO识别服务
public RecognitionResult recognize(MultipartFile image) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.MULTIPART_FORM_DATA);
    MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
    body.add("file", image.getResource());
    HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
    return restTemplate.postForObject("http://localhost:8086/api/recognize", 
                                      request, RecognitionResult.class);
}
```

## 2.6 数据库架构

### 2.6.1 数据库隔离原则

每个微服务拥有独立数据库，禁止跨服务直接访问数据库：

- `shop_product`：商品数据库（商品表、分类表、库存表）
- `shop_order`：订单数据库（订单表、订单明细表）
- `shop_user`：用户数据库（用户表、地址表）
- `shop_payment`：支付数据库（支付记录表）
- `Neo4j`：知识图谱数据库（商品实体、关系、属性）

### 2.6.2 缓存架构

采用三级缓存策略：

```
L1: 浏览器缓存（静态资源）
     ↓
L2: 本地缓存 Caffeine（热点数据，TTL 30s）
     ↓ miss
L3: 分布式缓存 Redis（商品详情、用户Session，TTL 30min）
     ↓ miss
L4: 数据库 MySQL
```

**缓存策略：**
- 商品信息：Cache Aside Pattern，更新时失效缓存
- 用户Session：Redis存储，滑动窗口续期
- 推荐结果：预计算Top500缓存，JSON+HMAC签名
- 接口幂等Token：Redis存储，5分钟过期

## 2.7 安全架构

### 2.7.1 认证流程

```
1. 用户登录 → User Service验证用户名密码
2. 生成JWT Token（有效期2小时）
3. Token返回给前端存储（localStorage）
4. 前端请求携带Authorization: Bearer <token>
5. Gateway全局过滤器验证Token有效性
6. 验证通过放行，验证失败返回401
```

### 2.7.2 接口安全

- 分布式锁防重复下单（Redis SETNX，10秒过期）
- 幂等Token防重复支付（Redis删除即确认）
- Sentinel QPS限流：商品列表1000/s，下单500/s，支付100/s
- XSS过滤、SQL注入防护（MyBatis预编译）

## 2.8 可观测性架构

### 2.8.1 链路追踪

- TraceId：全链路唯一标识，Gateway生成
- SpanId：单次调用标识
- MDC透传：TraceId贯穿所有日志
- Zipkin UI可视化调用链路与耗时

### 2.8.2 指标监控

**业务指标：**
- QPS/TPS、响应时间分布（P50/P90/P99）
- 订单量、支付成功率、识别准确率
- 推荐点击率、转化率

**系统指标：**
- CPU、内存、磁盘IO、网络流量
- JVM堆内存、GC次数、线程数
- 数据库连接池、慢查询
- Redis命中率、OPS

### 2.8.3 日志规范

日志格式：
```
[时间] [TraceId] [SpanId] [级别] [服务名] [类名] - 日志内容
```

日志级别：ERROR > WARN > INFO > DEBUG

## 2.9 部署架构

开发环境采用本地部署方案：

```
本地开发机
├── Nacos (8848) - 单机模式
├── MySQL (3306) - 单实例
├── Redis (6379) - 单实例
├── Zipkin (9411) - 单机
├── Prometheus (9090) + Grafana (3001)
├── 各微服务 (JDK 11) - Maven启动
├── AI服务 (Python 3.10) - 独立进程
└── 前端 (Node.js 18+) - npm run dev
```

生产环境可扩展为Docker+K8s容器化部署。

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
