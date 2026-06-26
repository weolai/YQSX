# 系统架构设计

## 1. 总体架构

本系统采用 **Spring Cloud Alibaba 微服务架构**，前端基于 **Next.js**，AI 问答模块基于 **Neo4j 知识图谱 + DeepSeek 大模型** 双引擎。

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端层 (Next.js)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │   商品列表    │  │   购物车/订单  │  │   AI 问答助手 (KBOQA)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │
│                                      │                                  │
│                                      ▼                                  │
│                         /api/kboqa/question                            │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           网关层 (Gateway :8080)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │ /api/user/**│  │/api/products│  │ /api/kg/**  │  │ 其他业务路由    │ │
│  │ 用户服务     │  │  商品服务    │  │ 知识图谱 QA │  │                │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────────┘ │
│                                                                       │
│  职责：JWT 统一鉴权、白名单控制、路由转发、X-User-Id 注入、Sentinel 保护  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  业务服务 (Java)     │  │  业务服务 (Java)     │  │  AI 问答服务 (Python) │
│ shop-user-server    │  │ shop-product-server │  │  RAG4Pro / api.py   │
│     :8083           │  │      :8081          │  │    :5000            │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
            │                         │                         │
            ▼                         ▼                         ▼
       ┌─────────┐              ┌─────────┐              ┌──────────┐
       │  MySQL  │              │  MySQL  │              │  Neo4j   │
       │ user DB │              │product DB              │ 图数据库  │
       └─────────┘              └─────────┘              └──────────┘
```

---

## 2. AI 问答模块架构

### 2.1 设计目标

- **可解释**：商品类问题（价格/库存/销量/类目）优先从 Neo4j 图谱查询，答案可追溯。
- **可扩展**：开放性问题由 DeepSeek 大模型兜底，保证对话体验。
- **统一入口**：所有外部请求必须通过 Gateway (`/api/**`)，由 Gateway 统一鉴权。

### 2.2 请求流程

```text
用户提问
    │
    ▼
[Next.js] /api/kboqa/question
    │
    ├── 1. 提取用户 JWT
    │
    ▼
[Gateway] POST /api/kg/query
    │
    ├── JWT 校验
    ├── 注入 X-User-Id
    └── 转发到 Python KG API
    │
    ▼
[RAG4Pro /api.py] QueryEngine
    │
    ├── 意图识别 (IntentRecognizer)
    ├── 实体链接 (EntityLinker / Trie)
    ├── Cypher 模板匹配
    ├── Neo4j 执行查询
    └── 结果格式化
    │
    ▼
命中？ ──是──▶ 返回答案 + 推荐商品
    │
    否
    ▼
[Next.js] 向量检索 + DeepSeek Prompt
    │
    ▼
返回答案
```

### 2.3 数据流

#### 图谱构建

```text
商城 MySQL (shop-product)
    │
    ├── t_product_category  ──▶  Neo4j :Category
    └── t_product          ──▶  Neo4j :Product
    │
    └── 关系：Product -[:BELONGS_TO_CATEGORY]-> Category
```

#### 问答执行

```text
自然语言问题
    │
    ├── 实体链接：识别 Product / Category / Brand
    ├── 意图识别：query_attr / query_relation / filter / compare
    └── Cypher 生成与执行
```

---

## 3. 核心组件

### 3.1 Gateway（网关）

- **端口**：8080
- **技术栈**：Spring Cloud Gateway + Spring Cloud Alibaba Sentinel
- **核心职责**：
  - 统一入口：所有外部请求走 `http://localhost:8080/api/**`
  - JWT 鉴权：校验 `Authorization: Bearer <token>`，无效返回 `401`
  - 白名单：`/api/user/login`、`/api/user/hello` 等匿名可访问
  - 注入 `X-User-Id` 头，下游服务无需重复鉴权
  - 路由转发：
    - `/api/user/**` → shop-user-service
    - `/api/products/**` → shop-product-service
    - `/api/orders/**` → shop-order-service
    - `/api/payment/**` → shop-payment-service
    - `/api/kg/**` → RAG4Pro Python API

### 3.2 RAG4Pro（知识图谱 QA 服务）

- **端口**：5000
- **技术栈**：Python + Flask + py2neo + Neo4j
- **核心模块**：
  - `graph_builder.py`：从 ChineseEcomQA 或 MySQL 抽取实体关系
  - `sync_products_to_neo4j.py`：商城真实商品数据同步
  - `query_engine.py`：意图识别、实体链接、Cypher 执行
  - `cypher_templates.py`：可复用 Cypher 模板
  - `api.py`：Flask REST API
- **接口**：
  - `POST /query`：自然语言问答
  - `POST /recommend`：关联商品推荐

### 3.3 shop-web-next（前端）

- **端口**：3000
- **技术栈**：Next.js 16 + TypeScript + Tailwind CSS
- **AI 问答入口**：
  - 全局悬浮小人 → `KboqaDialog`
  - `/kboqa-chat` 独立页面
- **路由**：`/api/kboqa/question`
  - 优先调 KG API（Neo4j）
  - 未命中则调 DeepSeek LLM

---

## 4. 数据模型

### 4.1 Neo4j 图谱 Schema

#### 节点

| 标签 | 属性 | 说明 |
|------|------|------|
| `Brand` | `name`, `main_business`, `origin`, `founded_year` | 品牌 |
| `Product` | `name`, `price`, `stock`, `sales`, `image_url`, `mysql_id` | 商品 |
| `Category` | `name`, `alias`, `description` | 类目 |
| `AttributeValue` | `name`, `attr_type` | 属性值 |

#### 关系

| 关系类型 | 起止节点 | 说明 |
|----------|----------|------|
| `BELONGS_TO_BRAND` | Product → Brand | 商品属于品牌 |
| `BELONGS_TO_CATEGORY` | Product → Category | 商品属于类目 |
| `HAS_CATEGORY` | Brand → Category | 品牌拥有类目 |
| `HAS_ATTRIBUTE` | Brand → AttributeValue | 品牌具有某属性 |

### 4.2 MySQL 数据源

| 表 | 字段 | 映射到 Neo4j |
|----|------|--------------|
| `t_product_category` | `id`, `name`, `display_name`, `description`, `status` | `Category` |
| `t_product` | `id`, `name`, `price`, `stock`, `category_id`, `image_url`, `sales` | `Product` |

---

## 5. 安全设计

- **Gateway 统一鉴权**：除白名单接口外，所有请求必须携带有效 JWT。
- **Token 透传**：Next.js `/api/kboqa/question` 将用户 JWT 透传给 Gateway。
- **X-User-Id**：Gateway 解析 token 后注入 `X-User-Id`，Python KG API 无需自行鉴权。
- **CORS**：Python KG API 开启 CORS，但生产环境建议仅允许 Gateway 访问。

---

## 6. 部署与启动顺序

### 6.1 开发环境（无 Nacos）

```text
1. 启动 Neo4j
2. 启动 MySQL
3. 同步商城数据到 Neo4j
   cd RAG4Pro && python sync_products_to_neo4j.py --reset --mysql-password 1234
4. 启动 Python KG API
   cd RAG4Pro && python api.py
5. 启动 Gateway（dev profile）
   cd shop-gateway-server && mvn spring-boot:run -DskipTests "-Dspring-boot.run.jvmArguments=-Dspring.profiles.active=dev"
6. 启动 Next.js
   cd shop-web-next && npm run dev
```

### 6.2 生产环境（有 Nacos）

```text
1. 启动 Zipkin
2. 启动 Nacos
3. 启动 Gateway
4. 启动 user / product / order / payment 服务
5. 启动 Python KG API
6. 启动 Next.js
```

---

## 7. 扩展规划

| 方向 | 说明 |
|------|------|
| 品牌同步 | MySQL 增加品牌表后，扩展 `sync_products_to_neo4j.py` 同步 Brand 节点 |
| 属性扩展 | 从商品详情中提取颜色、尺寸、规格等属性，丰富 Product 节点 |
| 向量召回 | 对无法图谱化的问题，结合 Embedding 做语义召回，再让 LLM 生成答案 |
| 多轮对话 | 在 QueryEngine 中维护会话上下文，支持指代消解 |
| 生产部署 | Python API 使用 Gunicorn/uWSGI，配置 Gateway 负载均衡与健康检查 |
