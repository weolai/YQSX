# 企业级商城系统 - 项目结构与文件说明

## 一、项目总览

本项目是基于 **Spring Cloud Alibaba** 微服务架构的企业级商城系统，集成 **YOLOv11** 图像识别能力，实现智能商品识别与订单管理。

| 属性 | 值 |
|-----|-----|
| 项目名称 | YQSX |
| 技术架构 | Spring Cloud Alibaba + Vue3 |
| 开发语言 | Java 11 + Python 3.x |
| 构建工具 | Maven |
| 注册中心 | Nacos 2.x |
| 限流熔断 | Sentinel 1.8+ |
| 数据库 | MySQL 8.0+ |

---

## 二、项目完整目录结构

```
YQSX/
├── Test/                          # 后端工作区（微服务项目）
│   └── shop-parent/               # Maven父项目
│       ├── shop-product-api/      # 商品服务API模块
│       ├── shop-product-server/   # 商品服务实现模块
│       ├── shop-order-api/        # 订单服务API模块
│       ├── shop-order-server/     # 订单服务实现模块
│       ├── logs/                  # 运行日志
│       ├── init.sql               # 数据库初始化脚本
│       ├── pom.xml                # 父项目依赖管理
│       └── 项目验证报告.md         # 项目验证报告
│
├── XML/                           # 配置与工具环境
│   ├── apache-maven-3.8.6/        # Maven构建工具
│   ├── apache-jmeter-5.6.3/       # JMeter性能测试工具
│   ├── nacos/                     # Nacos注册/配置中心
│   ├── sql/                       # SQL脚本目录
│   └── yolo_recognition_model/    # YOLO图像识别模型包
│
├── 课件/                          # 学习资料与课程文档
│   ├── Day_01 Nacos/              # Nacos注册中心课程
│   ├── Day_02(负载均衡)/           # 负载均衡课程
│   ├── Day_03(限流)/              # Sentinel限流课程
│   ├── Day_04(网关)/              # Gateway网关课程
│   ├── Day_05(配置中心)/          # Nacos配置中心课程
│   └── Day_06(链路追踪)/          # Sleuth链路追踪课程
│
├── docs/                          # 项目文档目录
│   ├── architecture.md            # 系统架构设计
│   ├── database.md                # 数据库设计规范
│   ├── api-standard.md            # API开发标准
│   ├── rbac.md                    # RBAC权限模型
│   ├── code-generator.md          # 代码生成器指南
│   ├── frontend-rules.md          # 前端开发规范
│   ├── backend-rules.md           # 后端开发规范
│   ├── project-rules.md           # 项目开发规则
│   ├── agent-workflow.md          # AI Agent工作流
│   ├── completion-report.md       # 完成报告
│   └── README.md                  # 知识库总览
│
├── logs/                          # 项目日志目录
├── .vscode/                       # VS Code配置
└── CLAUDE.md                      # AI开发框架总纲
```

---

## 三、核心模块详解

### 3.1 后端微服务 - shop-parent

#### 3.1.1 父项目配置

| 文件 | 路径 | 说明 |
|-----|------|-----|
| pom.xml | Test/shop-parent/pom.xml | Maven父项目，管理全局依赖版本（Spring Boot 2.3.2、Spring Cloud Hoxton.SR8、Spring Cloud Alibaba 2.2.3） |
| init.sql | Test/shop-parent/init.sql | 数据库初始化脚本，创建shop-product和shop-order库及表结构 |

#### 3.1.2 商品服务 - shop-product-api

| 文件 | 路径 | 说明 |
|-----|------|-----|
| pom.xml | Test/shop-parent/shop-product-api/pom.xml | API模块依赖，引入MyBatis Plus |
| Product.java | Test/shop-parent/shop-product-api/src/main/java/com/gec/shop/product/pojo/Product.java | 商品实体类，映射`t_product`表（id、name、price、stock） |

#### 3.1.3 商品服务 - shop-product-server

| 文件 | 路径 | 说明 |
|-----|------|-----|
| pom.xml | Test/shop-parent/shop-product-server/pom.xml | 服务实现模块依赖 |
| ProductServer.java | Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/ProductServer.java | Spring Boot启动类，启用Nacos服务发现 |
| ProductController.java | Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/controller/ProductController.java | REST控制器，提供商品查询接口 `/products/{pid}` |
| ProductService.java | Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/service/ProductService.java | 商品服务接口，继承MyBatis Plus IService |
| ProductServiceImpl.class | target目录 | 商品服务实现类（编译后） |
| ProductMapper.java | Test/shop-parent/shop-product-server/src/main/java/com/gec/shop/product/mapper/ProductMapper.java | 商品数据访问层，继承MyBatis Plus BaseMapper |
| application.yml | Test/shop-parent/shop-product-server/src/main/resources/application.yml | 服务配置：端口8081、数据源、Nacos注册地址 |

#### 3.1.4 订单服务 - shop-order-api

| 文件 | 路径 | 说明 |
|-----|------|-----|
| pom.xml | Test/shop-parent/shop-order-api/pom.xml | API模块依赖 |
| Order.java | Test/shop-parent/shop-order-api/src/main/java/com/gec/shop/order/pojo/Order.java | 订单实体类，映射`t_order`表（id、uid、username、pid、productName、productPrice、number） |
| User.java | Test/shop-parent/shop-order-api/src/main/java/com/gec/shop/order/pojo/User.java | 用户实体类（远程调用用户服务时使用） |

#### 3.1.5 订单服务 - shop-order-server

| 文件 | 路径 | 说明 |
|-----|------|-----|
| pom.xml | Test/shop-parent/shop-order-server/pom.xml | 服务实现模块依赖 |
| OrderServer.java | Test/shop-parent/shop-order-server/src/main/java/com/gec/shop/order/OrderServer.java | Spring Boot启动类，启用Nacos、Feign、负载均衡 |
| application.yml | Test/shop-parent/shop-order-server/src/main/resources/application.yml | 服务配置：端口8091、Sentinel配置、Ribbon随机策略、Feign超时设置 |

**Controller层**

| 文件 | 说明 |
|-----|-----|
| OrderController.java | 订单控制器，提供订单创建接口 `/orders/save` |
| SentinelController.java | Sentinel演示控制器，演示流控模式（关联流控、链路流控） |
| FallBackController.java | 降级规则演示控制器，演示慢调用比例、异常比例、异常数降级 |
| HotSpotController.java | 热点参数限流控制器，演示热点参数限流规则 |
| AuthController.java | 授权规则演示控制器，演示黑白名单授权规则 |
| AnnoController.java | 注解演示控制器，演示@SentinelResource注解使用（blockHandler、fallback） |

**Service层**

| 文件 | 说明 |
|-----|-----|
| OrderService.java | 订单服务接口，定义createOrder方法 |
| OrderServiceImpl.class | 订单服务实现类（编译后） |
| GoodService.java | 商品查询服务，用于链路流控模式演示 |

**Feign远程调用**

| 文件 | 说明 |
|-----|-----|
| IProductFeignService.java | 商品服务Feign客户端，定义远程调用接口 |
| IUserFeignService.java | 用户服务Feign客户端，定义用户服务调用接口 |
| ProductFeignFallBack.java | Feign降级兜底类，商品服务不可用时返回降级数据 |

**Config配置**

| 文件 | 说明 |
|-----|-----|
| ResultData.java | 统一返回结果类，封装Sentinel异常响应数据 |
| ExceptionHandlerPage.java | Sentinel异常处理器，自定义限流/降级/授权等异常的返回格式 |
| RequestOriginParserDefinition.java | 请求来源解析器，解析请求来源用于授权规则判断 |

**Mapper层**

| 文件 | 说明 |
|-----|-----|
| OrderMapper.java | 订单数据访问层，继承MyBatis Plus BaseMapper |

---

### 3.2 环境与工具 - XML/

| 目录 | 说明 |
|-----|-----|
| apache-maven-3.8.6/ | Maven 3.8.6 构建工具 |
| apache-jmeter-5.6.3/ | JMeter 5.6.3 性能测试工具 |
| nacos/ | Nacos 2.x 注册中心与配置中心，包含启动脚本、配置文件、日志、数据目录 |
| sql/ | SQL脚本目录（nacos-mysql.sql、shop-order.sql、shop-product.sql） |
| yolo_recognition_model/ | YOLO图像识别模型包，包含数据集配置、训练脚本等 |

---

### 3.3 学习资料 - 课件/

| 目录 | 内容 |
|-----|-----|
| Day_01 Nacos/ | Nacos注册中心原理与实践 |
| Day_02(负载均衡)/ | Ribbon负载均衡策略 |
| Day_03(限流)/ | Sentinel限流熔断规则配置 |
| Day_04(网关)/ | Spring Cloud Gateway路由与过滤器 |
| Day_05(配置中心)/ | Nacos配置中心动态配置 |
| Day_06(链路追踪)/ | Sleuth + Zipkin链路追踪 |

---

### 3.4 项目文档 - docs/

| 文件 | 说明 |
|-----|-----|
| README.md | 知识库总览，项目文档索引 |
| architecture.md | 系统架构设计，技术架构、服务划分、缓存策略、安全架构等 |
| database.md | 数据库设计规范 |
| api-standard.md | API开发标准 |
| rbac.md | RBAC权限模型 |
| code-generator.md | 代码生成器使用指南 |
| frontend-rules.md | Vue3前端开发规范 |
| backend-rules.md | Spring Boot后端开发规范 |
| project-rules.md | 项目开发规则 |
| agent-workflow.md | AI Agent协作工作流 |
| project-structure.md | 项目结构与文件说明（本文档） |

---

## 四、服务通信关系

```
┌──────────────────────┐     OpenFeign     ┌──────────────────────┐
│   shop-order-server  │ ────────────────→ │ shop-product-server │
│     (端口: 8091)     │                  │     (端口: 8081)     │
│                      │                  │                      │
│  OrderController     │                  │  ProductController   │
│       │              │                  │       │              │
│       ↓              │                  │       ↓              │
│  OrderService        │                  │  ProductService      │
│       │              │                  │       │              │
│       ↓              │                  │       ↓              │
│  IProductFeignService│                  │  ProductMapper       │
│       │              │                  │                      │
│       ↓              │                  └──────────────────────┘
│  ProductFeignFallBack│
│                      │
└──────────────────────┘
```

---

## 五、数据库结构

### 5.1 shop-product 库

**t_product 表**

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | bigint | 主键（自增） |
| name | varchar(255) | 商品名称 |
| price | double(10,2) | 商品价格 |
| stock | int | 库存数量 |

### 5.2 shop-order 库

**t_order 表**

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | bigint | 主键（自增） |
| uid | bigint | 用户ID |
| username | varchar(255) | 用户名称 |
| pid | bigint | 商品ID |
| product_name | varchar(255) | 商品名称 |
| product_price | double | 商品单价 |
| number | int | 购买数量 |

---

## 六、服务配置汇总

| 服务 | 端口 | 服务名称 | 数据库 |
|-----|------|---------|--------|
| 商品服务 | 8081 | shop-product-service | shop-product |
| 订单服务 | 8091 | shop-order-service | shop-order |
| Nacos | 8848 | - | - |
| Sentinel Dashboard | 8858 | - | - |

---

## 七、核心技术特性

| 特性 | 实现方式 | 说明 |
|-----|---------|-----|
| 服务注册发现 | Nacos Discovery | 服务自动注册与发现 |
| 负载均衡 | Ribbon | 随机策略（可配置） |
| 远程调用 | OpenFeign | 声明式REST客户端 |
| 限流熔断 | Sentinel | 流控、降级、热点、授权、系统保护 |
| 容错降级 | Feign Fallback | 远程调用降级兜底 |
| ORM框架 | MyBatis Plus | 简化CRUD操作 |
| 日志框架 | SLF4J + Logback | 统一日志输出 |

---

**最后更新**: 2026-06-18  
**项目状态**: 开发中（商品服务、订单服务已完成基础功能）