# 模块设计

![模块关系图](assets/module-diagram.png)

## 3.1 模块总览

系统共包含8个核心服务模块，按职责划分为四大类：

| 类别 | 模块 | 技术栈 | 端口 |
|-----|------|-------|------|
| 基础设施 | Nacos服务 | Nacos 2.x | 8848 |
| 流量入口 | Gateway网关 | Spring Cloud Gateway | 8080 |
| 业务微服务 | 商品服务 | Spring Boot + MyBatis Plus | 8081 |
| | 订单服务 | Spring Boot + OpenFeign | 8091 |
| | 用户服务 | Spring Boot + JWT | 8083 |
| | 支付服务 | Spring Boot + 幂等 | 8084 |
| AI服务 | YOLO识别服务 | FastAPI + PyTorch + YOLOv11 | 8086 |
| | DIN推荐服务 | Flask + TensorFlow | 8000 |
| | KBQA问答服务 | Flask + Neo4j | 8087 |
| 前端 | Web前端 | Next.js 16 + React 19 | 3000 |

## 3.2 Gateway网关模块

### 3.2.1 模块职责

- **统一入口**：所有外部请求的唯一入口
- **路由转发**：根据路径将请求路由到对应微服务
- **JWT认证**：全局过滤器验证Token有效性
- **限流控制**：集成Sentinel实现QPS限流
- **跨域处理**：统一配置CORS
- **日志追踪**：生成TraceId并注入MDC

### 3.2.2 路由配置

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: product-service
          uri: lb://shop-product-server
          predicates:
            - Path=/api/product/**,/api/products/**
        - id: order-service
          uri: lb://shop-order-server
          predicates:
            - Path=/api/order/**,/api/orders/**
        - id: user-service
          uri: lb://shop-user-server
          predicates:
            - Path=/api/user/**,/api/users/**
        - id: payment-service
          uri: lb://shop-payment-server
          predicates:
            - Path=/api/payment/**
```

### 3.2.3 核心过滤器

- `AuthenticationFilter`：JWT Token验证，白名单路径（登录、注册）跳过
- `TraceIdFilter`：生成TraceId，写入MDC和响应头
- `RateLimitFilter`：基于Sentinel的限流控制

## 3.3 商品服务模块（Product）

### 3.3.1 模块职责

- 商品信息CRUD管理
- 商品分类管理
- 库存管理（扣减、恢复）
- 对接YOLO识别服务
- 商品搜索与列表查询

### 3.3.2 核心类设计

```
shop-product-server
├── controller
│   └── ProductController      # 商品接口
├── service
│   ├── ProductService         # 商品业务接口
│   └── impl
│       └── ProductServiceImpl # 商品业务实现
├── mapper
│   └── ProductMapper          # MyBatis Plus Mapper
├── entity
│   └── Product                # 商品实体
├── dto
│   ├── ProductDTO             # 商品数据传输对象
│   └── RecognitionResult      # 识别结果DTO
├── vo
│   └── ProductVO              # 商品视图对象
├── feign
│   └── RecognitionFeignClient # YOLO服务调用客户端
└── config
    └── RestTemplateConfig     # HTTP客户端配置
```

### 3.3.3 核心接口

| 接口 | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 商品列表 | GET | /api/products | 分页查询商品列表 |
| 商品详情 | GET | /api/products/{id} | 查询单个商品详情 |
| 商品搜索 | GET | /api/products/search | 按名称/分类搜索 |
| 添加商品 | POST | /api/products | 新增商品（管理端） |
| 更新商品 | PUT | /api/products | 更新商品信息 |
| 扣减库存 | PUT | /api/products/stock/deduct | Feign接口，下单时扣减 |
| 图像识别 | POST | /api/products/recognize | 上传图片识别商品 |

### 3.3.4 AI识别对接流程

```
前端上传图片
    ↓
ProductController.recognize()
    ↓
RecognitionFeignClient → YOLO服务 /api/recognize
    ↓
返回识别结果（类别、置信度、边界框）
    ↓
根据类别匹配数据库商品列表
    ↓
返回商品列表 + 推荐商品
```

## 3.4 订单服务模块（Order）

### 3.4.1 模块职责

- 订单创建（含防重复提交）
- 订单查询（用户订单列表、订单详情）
- 订单状态流转（待支付→已支付→已发货→已完成/已取消）
- Feign调用商品服务扣减库存
- Feign调用支付服务创建支付单
- Feign调用DIN服务获取个性化推荐

### 3.4.2 核心类设计

```
shop-order-server
├── controller
│   └── OrderController        # 订单接口
├── service
│   ├── OrderService           # 订单业务接口
│   └── impl
│       └── OrderServiceImpl   # 订单业务实现
├── mapper
│   └── OrderMapper            # 订单Mapper
│   └── OrderItemMapper        # 订单明细Mapper
├── entity
│   ├── Order                  # 订单实体
│   └── OrderItem              # 订单明细实体
├── dto
│   ├── OrderCreateDTO         # 创建订单DTO
│   └── OrderVO                # 订单视图对象
├── feign
│   ├── ProductFeignClient     # 商品服务调用
│   ├── PaymentFeignClient     # 支付服务调用
│   └── RecommendFeignClient   # 推荐服务调用
└── config
    └── RedisConfig            # Redis配置
```

### 3.4.3 订单状态机

```
待支付(1) ──支付成功──→ 已支付(2) ──发货──→ 待收货(3) ──确认收货──→ 已完成(4)
    │                                                          ↑
    └────超时/取消────→ 已取消(5) ←──────退款──────┘
```

### 3.4.4 防重复下单机制

```java
public OrderVO createOrder(OrderCreateDTO dto) {
    // 1. 分布式锁防重
    String lockKey = "order:create:" + userId + ":" + productId;
    Boolean locked = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, "1", 10, TimeUnit.SECONDS);
    if (!locked) {
        throw new BusinessException("请勿重复下单");
    }
    try {
        // 2. 检查库存
        productFeignClient.deductStock(productId, quantity);
        // 3. 创建订单
        Order order = buildOrder(dto);
        orderMapper.insert(order);
        // 4. 创建支付单
        paymentFeignClient.createPayment(order);
        return convertToVO(order);
    } finally {
        redisTemplate.delete(lockKey);
    }
}
```

## 3.5 用户服务模块（User）

### 3.5.1 模块职责

- 用户注册与登录
- JWT Token生成与验证
- 用户信息管理
- 密码加密存储（BCrypt）

### 3.5.2 认证流程

```
POST /api/user/login
    ↓
UserService.login(username, password)
    ↓
1. 根据用户名查询用户
2. BCrypt校验密码
3. 生成JWT Token（userId, username, exp）
4. Token存入Redis（可选，用于主动失效）
5. 返回Token + 用户信息
```

### 3.5.3 JWT Payload结构

```json
{
  "userId": 1,
  "username": "admin",
  "nickname": "管理员",
  "exp": 1718800000
}
```

## 3.6 支付服务模块（Payment）

### 3.6.1 模块职责

- 支付单创建
- 支付处理（模拟支付）
- 幂等性保证
- 支付状态更新
- 支付回调通知

### 3.6.2 幂等Token机制

```
创建订单时 → 生成UUID作为幂等Token → 存入Redis（5分钟TTL）
    ↓
发起支付 → 携带幂等Token
    ↓
PaymentService验证：
    1. Redis删除Token（原子操作）
    2. 删除成功 → 首次支付，继续处理
    3. 删除失败 → 重复支付，拒绝请求
```

```java
public PaymentVO pay(String idempotentToken) {
    String tokenKey = "payment:token:" + idempotentToken;
    Boolean deleted = redisTemplate.delete(tokenKey);
    if (!deleted) {
        throw new BusinessException("请勿重复支付");
    }
    // 处理支付逻辑...
}
```

## 3.7 YOLO识别服务模块

### 3.7.1 模块职责

- 接收前端上传的商品图片
- 使用YOLOv11模型进行目标检测
- 返回识别类别、置信度、边界框信息
- 支持19类零食商品识别

### 3.7.2 技术实现

```
recognition-service
├── main.py                    # FastAPI应用入口
├── models/
│   └── best.pt                # 训练好的YOLOv11模型
├── utils/
│   └── class_mapping.py       # 类别中文映射
└── requirements.txt           # Python依赖
```

### 3.7.3 核心接口

- `POST /api/recognize`：接收图片文件，返回识别结果
- `GET /health`：健康检查
- `GET /api/classes`：获取支持识别的类别列表

### 3.7.4 识别结果格式

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "detections": [
      {
        "class_id": 0,
        "class_name": "乐事薯片",
        "class_name_en": "Lay's",
        "confidence": 0.956,
        "bbox": [120, 80, 340, 290]
      }
    ],
    "processing_time_ms": 145
  }
}
```

## 3.8 DIN推荐服务模块

### 3.8.1 模块职责

- 基于用户历史行为序列进行个性化推荐
- 支持离线预计算和在线实时推理
- 提供Top-K推荐结果
- 推荐缓存管理（JSON+HMAC安全加固）

### 3.8.2 推荐流程

```
请求推荐(userId, k)
    ↓
检查缓存（JSON+HMAC校验）
    ├─ 缓存命中 → 业务重排（类目打散、去重）→ 返回结果
    └─ 缓存未命中 → 召回候选（相关类目+热门商品）
                      ↓
                   DIN精排打分
                      ↓
                   返回Top-K推荐
```

### 3.8.3 核心组件

- `Dice`：自定义Dice激活函数
- `AttentionPoolingLayer`：目标注意力池化层
- `build_din()`：构建DIN模型
- `build_recall_candidates()`：召回候选集构建
- `batch_precompute_topk()`：批量离线预计算
- `apply_business_rerank()`：业务规则重排

### 3.8.4 启动模式

```bash
# 训练模式
python din_model.py --mode train

# 服务模式
python din_model.py --mode serve

# 离线预计算
python din_model.py --mode precompute

# 单用户预测
python din_model.py --mode predict --user-id 123 --top-k 20
```

## 3.9 KBQA问答服务模块

### 3.9.1 模块职责

- 商品知识图谱构建与存储（Neo4j）
- 中文实体识别与链接
- 自然语言问题解析
- Cypher查询生成与执行
- 答案生成与返回

### 3.9.2 核心组件

```
RAG4Pro/
├── src/
│   ├── ner_entity_linker.py   # 实体识别与链接
│   ├── query_parser.py        # 问题解析
│   ├── cypher_templates.py    # Cypher模板
│   ├── query_engine.py        # 查询执行引擎
│   └── graph_builder.py       # 图谱构建
├── data/
│   └── ChineseEcomQA.jsonl    # 电商问答数据集
├── api.py                     # Flask API入口
├── sync_products_to_neo4j.py  # 商品数据同步
└── requirements.txt
```

### 3.9.3 问答流程

```
用户问题输入
    ↓
实体识别（NER）→ 识别商品名、属性、品牌等实体
    ↓
实体链接 → 链接到Neo4j中的节点
    ↓
意图识别 → 分类问题类型（推荐、查询属性、比较等）
    ↓
Cypher生成 → 基于模板生成图查询
    ↓
执行查询 → Neo4j返回结果
    ↓
答案生成 → 自然语言答案组装
```

## 3.10 Web前端模块

### 3.10.1 页面清单

| 页面 | 路由 | 功能 |
|-----|------|------|
| 登录页 | /login | 用户登录 |
| 首页 | / | 轮播、分类入口、热门推荐 |
| 商品列表 | /products | 分类筛选、排序、搜索 |
| 商品详情 | /products/[id] | 商品信息、规格、加入购物车 |
| AI识别页 | /recognize | 拍照/上传图片、识别结果、一键购买 |
| 购物车 | /cart | 购物车商品管理 |
| 订单列表 | /orders | 订单列表、状态筛选 |
| 订单详情 | /orders/[id] | 订单详情、支付、确认收货 |
| 用户中心 | /profile | 个人信息、收货地址 |

### 3.10.2 目录结构

```
shop-web-next/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── login/
│   │   ├── products/
│   │   ├── recognize/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── profile/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # 公共组件
│   │   ├── ui/               # shadcn组件
│   │   ├── Header.tsx
│   │   ├── ProductCard.tsx
│   │   └── ImageUploader.tsx
│   ├── lib/
│   │   ├── api.ts            # Axios封装
│   │   ├── auth.ts           # Token管理
│   │   └── store.ts          # Zustand状态
│   └── types/
│       └── index.ts          # TypeScript类型定义
└── public/
    └── images/
```

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
