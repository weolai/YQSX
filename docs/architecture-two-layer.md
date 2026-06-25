# 应用层与算法层双层架构设计

> 本文档梳理项目「应用层」与「算法层」的文件结构、职责边界、通信机制及数据流向。

---

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户 (浏览器/移动端)                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        应用层 (Application Layer)                     │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Next.js  │  │ Gateway  │  │ Product  │  │  Order   │           │
│  │ 前端     │  │ 网关     │  │ 商品服务 │  │  订单    │           │
│  │ :3000    │  │ :8080    │  │ :8081    │  │  :8091   │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │               │
│       └──────────────┴──────┬───────┴──────────────┘               │
│                              │ Feign (HTTP) / Stream               │
│                              │ 封装图片 → 上传 Nacos 注册表         │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │      Nacos          │
                    │  服务注册/发现中心   │
                    │    :8848            │
                    └──────────┬──────────┘
                               │ 服务发现 + 心跳
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       算法层 (Algorithm Layer)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            Recognition Service (FastAPI + YOLO)               │   │
│  │                         :8086                                │   │
│  │                                                              │   │
│  │  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │   │
│  │  │ main.py     │───▶│ yolo_engine  │───▶│ best_optimized │  │   │
│  │  │ API 入口    │    │ 推理引擎     │    │ .pt 模型       │  │   │
│  │  └─────────────┘    └──────────────┘    └────────────────┘  │   │
│  │        │                                           │         │   │
│  │        ▼                                           ▼         │   │
│  │  ┌─────────────┐                         ┌────────────────┐  │   │
│  │  │nacos_registry│                        │  MySQL         │  │   │
│  │  │服务注册/心跳 │                        │shop-product DB │  │   │
│  │  └─────────────┘                         └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                      JSON 识别结果                                   │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               ▼ (返回给应用层)
```

---

## 2. 两层定义与职责

### 2.1 应用层 (Application Layer)

| 属性 | 说明 |
|------|------|
| **技术栈** | Spring Cloud Alibaba (Java) + Next.js (React/TypeScript) |
| **核心职责** | 业务逻辑、用户交互、订单支付、商品管理、API 网关 |
| **与算法层关系** | 调用方（Caller），通过 Feign/HTTP 发送待识别图片，接收识别结果后做推荐 |
| **入口** | `http://localhost:8080/api/**`（统一经 Gateway） |

### 2.2 算法层 (Algorithm Layer)

| 属性 | 说明 |
|------|------|
| **技术栈** | Python 3.13 + FastAPI + Ultralytics YOLO + PyTorch (CPU) |
| **核心职责** | 图片目标检测、YOLO 推理、类别映射、Nacos 服务注册 |
| **与应用层关系** | 服务提供方（Provider），从 Nacos 接收请求，解码处理后返回结果 |
| **模型** | `best_optimized.pt` — 19 类伊朗零食检测模型 |

---

## 3. 数据流详解

### 3.1 图片上传识别流程

```
用户上传图片
    │
    ▼
[前端] shop-web-next/src/app/recognize/page.tsx
    │  FormData(file) → POST /api/product/recognize
    ▼
[Gateway] shop-gateway-server (:8080)
    │  路由转发 → /api/product/**
    ▼
[Product Service] shop-product-server (:8081)
    │  ProductController.recognize(file, uid)
    │  ├── 生成 requestId
    │  └── RecognitionFeignClient.recognizeImage(file)   ← Feign 远程调用
    ▼
[Nacos] 服务发现
    │  查找 "shop-recognition-service" 实例地址
    ▼
[Recognition Service] recognition-service (:8086)
    │  POST /api/recognition/v1/recognize/image
    │  ├── YOLOEngine.predict(image_data)
    │  │   ├── Image.open() → RGB 转换
    │  │   ├── model.predict(source=image, conf=0.60, iou=0.45)
    │  │   └── 解析 boxes → class_id, class_name, confidence, bbox
    │  └── 返回 RecognitionResult JSON
    ▼
[Product Service] 收到识别结果
    │  resolveMultiCategoryRecommendation()
    │  ├── 多检测结果 → 映射商品类别
    │  ├── buildUserInterestEmbedding(uid)     ← DIN 用户兴趣嵌入
    │  ├── scoreWithDinAlgorithm()             ← DIN 打分排序
    │  └── 返回 RecognitionResponseVo (含推荐商品列表)
    ▼
[前端] 渲染识别结果面板
    │  result-panel.tsx 展示检测框 + 推荐商品
```

### 3.2 实时检测流程 (Stream/TCP 扩展预留)

```
摄像头/视频流
    │
    ▼
[前端] MediaStream API / getUserMedia()
    │  帧提取 → Base64 / Blob
    ▼
[Gateway] WebSocket 升级 (预留)
    │  二进制帧流转发
    ▼
[Recognition Service] 流式推理模式
    │  逐帧 predict() → 结果推回
    ▼
[前端] 实时叠加检测框 (detection-overlay.tsx)
```

---

## 4. 文件清单

### 4.1 应用层文件清单

#### 4.1.1 后端 Java 微服务 (Spring Cloud)

```
Test/shop-parent/
├── pom.xml                                    # 父 POM，统一依赖管理
│
├── shop-gateway-server/                       # API 网关
│   └── src/main/java/com/gec/shop/gateway/
│       ├── config/
│       │   ├── CorsConfig.java               # CORS 跨域配置
│       │   ├── RouteConfig.java              # 路由规则配置
│       │   └── SecurityConfig.java           # JWT 安全过滤链
│       └── filter/
│           ├── AuthFilter.java               # JWT Token 校验过滤器
│           └── RequestLogFilter.java         # 请求日志过滤器
│
├── shop-user-server/                          # 用户服务
│   └── src/main/java/com/gec/shop/user/
│       ├── controller/UserController.java    # 用户 REST 接口
│       ├── service/impl/UserServiceImpl.java # 用户业务逻辑
│       └── pojo/User.java                    # 用户实体
│
├── shop-product-server/                       # 商品服务 ★ 核心对接点
│   └── src/main/java/com/gec/shop/product/
│       ├── controller/ProductController.java # 商品 & 识别接口
│       ├── service/
│       │   ├── ProductService.java           # 商品服务接口
│       │   └── impl/ProductServiceImpl.java  # ★ DIN 推荐算法实现
│       ├── feign/
│       │   ├── RecognitionFeignClient.java   # ★ 调用算法层的 Feign 客户端
│       │   └── RecognitionFeignFallback.java # 降级处理
│       ├── vo/
│       │   └── RecognitionResponseVo.java    # 识别响应 VO
│       ├── dto/
│       │   └── RecognitionResultDto.java     # 识别结果 DTO
│       ├── pojo/
│       │   ├── Product.java                  # 商品实体
│       │   ├── ProductCategory.java          # 商品类别实体
│       │   └── RecognitionLog.java            # 识别日志实体
│       ├── mapper/
│       │   ├── ProductMapper.java            # 商品 Mapper
│       │   ├── ProductCategoryMapper.java    # 类别 Mapper
│       │   └── RecognitionLogMapper.java      # 日志 Mapper
│       └── config/
│           └── FeignConfig.java              # Feign 配置
│
├── shop-order-server/                         # 订单服务
│   └── src/main/java/com/gec/shop/order/
│       ├── controller/OrderController.java
│       └── service/impl/OrderServiceImpl.java
│
└── shop-payment-server/                       # 支付服务
    └── src/main/java/com/gec/shop/payment/
        ├── controller/PaymentController.java
        └── service/impl/PaymentServiceImpl.java
```

#### 4.1.2 前端 (Next.js)

```
shop-web-next/src/
├── app/                                        # 页面路由
│   ├── page.tsx                                # 首页
│   ├── layout.tsx                              # 全局布局
│   ├── login/page.tsx                          # 登录页
│   ├── recognize/page.tsx                      # ★ 拍照识别页
│   ├── products/page.tsx                       # 商品列表页
│   ├── products/[id]/page.tsx                  # 商品详情页
│   ├── orders/page.tsx                         # 订单列表页
│   ├── orders/[id]/page.tsx                    # 订单详情页
│   └── payment/[orderId]/page.tsx              # 支付页
│
├── components/
│   ├── recognize/                               # ★ 识别相关组件
│   │   ├── image-uploader.tsx                  # 图片上传组件
│   │   ├── detection-overlay.tsx               # 检测框叠加层
│   │   └── result-panel.tsx                    # 识别结果+推荐面板
│   ├── layout/navbar.tsx                       # 导航栏
│   ├── ui/                                     # UI 组件库
│   │   ├── limelight-nav.tsx                   # 顶部导航
│   │   ├── auth-fuse.tsx                       # 认证熔断
│   │   └── ... (button/card/input 等)
│   ├── fun/                                     # 互动组件
│   │   ├── snack-mascot.tsx                    # 互动小人
│   │   └── mascot-face.tsx
│   ├── payment/                                 # 支付状态视图
│   └── three/                                   # Three.js 3D 效果
│
├── lib/
│   ├── api/
│   │   ├── index.ts                            # API 统一封装
│   │   └── request.ts                          # Axios 请求器
│   ├── stores/auth.ts                          # Zustand 认证状态
│   └── utils/category-mapping.ts               # 类别映射工具
│
├── hooks/
│   ├── use-recognition.ts                      # ★ 识别 Hook
│   ├── use-is-client.ts
│   └── use-reduced-motion.ts
│
└── types/index.ts                              # TypeScript 类型定义
```

#### 4.1.3 基础设施 & 配置

```
XML/
├── nacos/                                      # Nacos 注册中心
│   └── bin/startup.cmd
├── zipkin-server-2.24.3-exec.jar               # 链路追踪
├── redis/redis.windows.conf                   # Redis 缓存
├── redis/redis-server.exe
├── sql/
│   ├── init.sql                                # 初始化建库脚本
│   └── shop-product-ai.sql                     # ★ AI 商品库完整 SQL
└── start_project.py                            # 一键启动脚本
```

---

### 4.2 算法层文件清单

```
XML/yolo_recognition_model/
│
├── README.md                                   # 模型包说明文档
│
├── models/trained/                             # ★ 模型权重目录
│   ├── best_optimized.pt                       # ★ 当前使用的优化模型 (5,369 KB)
│   ├── yolo11n.pt                              # YOLOv11n 预训练基座
│   ├── yolo26n.pt                              # YOLOv26n 预训练基座
│   ├── data.yaml                               # ★ 新模型数据集配置 (19 类)
│   ├── data_with_names.yaml                    # 含类别名称的配置副本
│   └── check_names.py                          # 模型类别名验证工具
│
├── dataset/                                    # 训练数据集
│   └── Iranian Snack and Chips Detection (YOLO Format)/
│       ├── data.yaml                           # Roboflow 数据集元信息
│       ├── train/images/ + train/labels/      # 训练集 (~300 张)
│       ├── valid/images/ + valid/labels/      # 验证集
│       └── test/images/ + test/labels/        # 测试集
│
├── recognition-service/                        # ★ 算法服务主程序
│   │
│   ├── app/main.py                             # ★ FastAPI 服务入口
│   │   ├── POST /api/recognition/v1/recognize/image  # 核心识别接口
│   │   ├── GET  /health                       # 健康检查
│   │   └── 启动流程: 建表 → 加载模型 → 注册 Nacos
│   │
│   ├── app/core/
│   │   ├── yolo_engine.py                     # ★ YOLO 推理引擎 (单例)
│   │   │   ├── CLASS_NAME_ZH_MAPPING          # class_id → 中文名映射
│   │   │   ├── load_model()                   # 加载 best_optimized.pt
│   │   │   ├── predict()                      # 图片推理 (线程安全)
│   │   │   └── get_model_info()               # 元数据查询
│   │   │
│   │   └── nacos_registry.py                  # ★ Nacos 注册客户端
│   │       ├── register()                     # 服务注册
│   │       ├── deregister()                   # 服务注销
│   │       ├── start_heartbeat()              # 心跳启动 (5s 间隔)
│   │       └── stop_heartbeat()               # 心跳停止
│   │
│   ├── app/models/                             # SQLAlchemy ORM 模型
│   │   ├── __init__.py
│   │   ├── product.py                          # 商品模型
│   │   ├── product_category.py                # 商品类别模型
│   │   └── recognition_log.py                 # 识别日志模型
│   │
│   ├── app/db/                                  # 数据库会话
│   │   ├── base.py                             # 声明式基类
│   │   └── session.py                          # Session 工厂
│   │
│   ├── tests/                                   # 测试套件
│   │   ├── test_case_2_direct_recognition.py   # 直接调用识别测试
│   │   ├── test_case_4_via_product_service.py  # 经由商品服务调用测试
│   │   ├── evaluate_model.py                   # 模型评估脚本
│   │   └── check_recognition_logs.py           # 日志检查脚本
│   │
│   ├── .env                                     # ★ 环境变量配置
│   │   ├── MODEL_PATH=../models/trained/best_optimized.pt
│   │   ├── NACOS_SERVER_ADDR=http://localhost:8848
│   │   └── DATABASE_URL=mysql+pymysql://...
│   │
│   ├── .env.example                             # 环境变量模板
│   ├── requirements.txt                         # Python 依赖
│   ├── environment.yml                          # Conda 环境导出
│   └── Dockerfile                               # 容器化部署
│
└── (training/ 目录 - 训练脚本，按需使用)
    ├── scripts/
    │   ├── train_yolov11_optimized.py          # YOLOv11 训练脚本
    │   ├── inference_optimized.py              # 推理验证脚本
    │   └── dataset_preprocessing.py            # 数据预处理
    └── configs/
        ├── baseline_config.yaml
        ├── fast_iteration_config.yaml
        ├── high_precision_config.yaml
        └── optimized_config.yaml
```

---

## 5. 两层通信协议

### 5.1 服务发现 (Nacos)

| 维度 | 应用层 | 算法层 |
|------|--------|--------|
| 角色 | Consumer (消费者) | Provider (提供者) |
| 注册名 | 通过 Feign name 查找 | `shop-recognition-service` |
| 注册方式 | Nacos Client SDK (Spring) | HTTP OpenAPI v1 (`nacos_registry.py`) |
| 心跳 | SDK 自动管理 | 手动 5s 间隔心跳循环 |
| 命名空间 | public | public |
| 分组 | DEFAULT_GROUP | DEFAULT_GROUP |

### 5.2 数据传输 (Feign HTTP)

```
请求方向: 应用层 → 算法层
协议: HTTP POST multipart/form-data
接口: /api/recognition/v1/recognize/image
参数: file (MultipartFile, 图片二进制)

响应格式:
{
  "recognitionId": "uuid",
  "timestamp": "2026-06-24T...",
  "imageDimensions": { "width": 1920, "height": 1080 },
  "processingTimeMs": 320,
  "modelVersion": "best-optimized-v1.0",
  "detections": [
    {
      "productClassId": 14,
      "productClassName": "薯片",
      "confidence": 0.8523,
      "boundingBox": { "x1": 120, "y1": 50, "x2": 450, "y2": 280 }
    },
    // ... 可能有多个检测结果
  ]
}
```

### 5.3 扩展通信方式 (规划中)

| 方式 | 适用场景 | 状态 |
|------|----------|------|
| **HTTP Feign** | 单张图片识别 | 已实现 |
| **WebSocket Stream** | 实时视频流检测 | 规划中 |
| **TCP 直连** | 高吞吐批量检测 | 规划中 |
| **消息队列 (MQ)** | 异步批量识别任务 | 规划中 |

---

## 6. 模型与类别映射

### 6.1 当前模型信息

| 属性 | 值 |
|------|-----|
| 文件 | `models/trained/best_optimized.pt` |
| 大小 | 5,369 KB |
| 类型 | Ultralytics YOLO 目标检测模型 |
| 类别数 | 19 |
| 输入尺寸 | 640 x 640 |
| 设备 | CPU (PyTorch CPU 模式) |

### 6.2 19 类别对照表

| class_id | 英文名 | 中文展示名 | 数据库 category_id |
|----------|--------|-----------|-------------------|
| 0 | Ayran | 阿兰酸奶 | 1 |
| 1 | Cay | 辣椒粉 | 2 |
| 2 | Fanta | 芬达 | 3 |
| 3 | IceTea | 冰茶 | 4 |
| 4 | Kola | 可乐 | 5 |
| 5 | Mehran | 梅兰食用油 | 6 |
| 6 | Meyve | 果汁 | 7 |
| 7 | Nescafe | 雀巢咖啡 | 8 |
| 8 | Pepsi | 百事可乐 | 9 |
| 9 | RedBull | 红牛 | 10 |
| 10 | Soda | 苏打水 | 11 |
| 11 | Sprite | 雪碧 | 12 |
| 12 | Sut | 牛奶 | 13 |
| 13 | Tropicana | 纯果乐 | 14 |
| 14 | cips | 薯片 | 15 |
| 15 | gofret | 威化饼干 | 16 |
| 16 | kakao | 可可制品 | 17 |
| 17 | kraker | 薄脆饼干 | 18 |
| 18 | seker | 糖果甜食 | 19 |

### 6.3 ID 映射链路

```
YOLO model output (class_id: 14)
    ↓ yolo_engine.py CLASS_NAME_ZH_MAPPING
中文展示名: "薯片"
    ↓ ProductServiceImpl.resolveMultiCategoryRecommendation()
productCategoryMapper.findByYoloClassId(14)
    ↓ 数据库 t_product_category
category_id = 15, display_name = "薯片"
    ↓ recommendByCategory(15, 5)
t_product WHERE category_id = 15 ORDER BY sales DESC LIMIT 5
    ↓ scoreWithDinAlgorithm() [DIN 打分]
最终推荐商品列表 (按 DIN 得分降序)
```

---

## 7. 启动顺序与依赖关系

```
阶段 1: 基础设施
  Zipkin (:9411) ──┐
  Redis (:6379)  ──┤
  MySQL (:3306)  ──┤
  Nacos (:8848)   ──┘

阶段 2: 应用层微服务 (并行启动)
  Gateway  (:8080)  ← 依赖 Nacos
  User     (:8083)  ← 依赖 Nacos
  Product  (:8081)  ← 依赖 Nacos + MySQL
  Order    (:8091)  ← 依赖 Nacos + MySQL
  Payment  (:8084)  ← 依赖 Nacos + MySQL

阶段 3: 算法层
  Recognition (:8086) ← 依赖 Nacos + MySQL + best_optimized.pt

阶段 4: 前端
  Next.js  (:3000)   ← 依赖 Gateway

一键启动命令:
  python start_project.py
```

---

## 8. 关键配置索引

| 配置项 | 文件路径 | 说明 |
|--------|---------|------|
| 模型路径 | `recognition-service/.env` → MODEL_PATH | 指向 `best_optimized.pt` |
| Nacos 地址 | `recognition-service/.env` → NACOS_SERVER_ADDR | `http://localhost:8848` |
| 置信度阈值 | `.env` → CONFIDENCE_THRESHOLD | 默认 0.60 |
| IOU 阈值 | `.env` → IOU_THRESHOLD | 默认 0.45 |
| Feign 调用名 | `RecognitionFeignClient.java` → @FeignClient(name) | `shop-recognition-service` |
| 类别映射 | `yolo_engine.py` → CLASS_NAME_ZH_MAPPING | 19 类 class_id→中文 |
| 数据库连接 | `.env` → DATABASE_URL | `mysql+pymysql://root:1234@...` |
| Gateway 路由 | RouteConfig.java | `/api/product/**` → `lb://shop-product-server` |
