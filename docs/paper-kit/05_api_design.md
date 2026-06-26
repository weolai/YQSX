# API接口设计

## 5.1 API设计规范

### 5.1.1 RESTful规范

- 使用HTTP方法表示操作类型：GET（查询）、POST（创建）、PUT（更新）、DELETE（删除）
- URL使用名词复数形式：`/api/products`、`/api/orders`
- 版本控制：URL路径中包含版本号 `/api/v1/`（当前版本v1，路径中可省略）
- 分页参数：`pageNum`（页码，从1开始）、`pageSize`（每页条数）

### 5.1.2 统一响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": { }
}
```

**状态码约定：**

| code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token无效或过期） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器内部错误 |

### 5.1.3 分页响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 10
  }
}
```

### 5.1.4 认证方式

除登录、注册等白名单接口外，所有接口需在请求头中携带JWT Token：

```
Authorization: Bearer <token>
```

## 5.2 用户服务接口（User Service :8083）

### 5.2.1 用户登录

- **接口**：`POST /api/user/login`
- **是否需要认证**：否
- **请求参数**（Query）：

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "userInfo": {
      "id": 1,
      "username": "admin",
      "nickname": "管理员",
      "avatar": ""
    }
  }
}
```

### 5.2.2 用户注册

- **接口**：`POST /api/user/register`
- **是否需要认证**：否
- **请求体**：

```json
{
  "username": "testuser",
  "password": "123456",
  "nickname": "测试用户",
  "mobile": "13800138000"
}
```

### 5.2.3 获取用户信息

- **接口**：`GET /api/user/info`
- **是否需要认证**：是
- **响应**：返回当前登录用户信息

## 5.3 商品服务接口（Product Service :8081）

### 5.3.1 商品列表

- **接口**：`GET /api/products`
- **是否需要认证**：否
- **请求参数**（Query）：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| pageNum | Integer | 否 | 1 | 页码 |
| pageSize | Integer | 否 | 10 | 每页条数 |
| categoryId | Long | 否 | - | 分类ID |
| keyword | String | 否 | - | 搜索关键词 |
| sortBy | String | 否 | sales | 排序字段：price/sales/create_time |
| sortOrder | String | 否 | desc | 排序方向：asc/desc |

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "乐事原味薯片",
        "price": 8.50,
        "originalPrice": 12.00,
        "mainImage": "/images/products/lays-original.jpg",
        "sales": 1520,
        "categoryId": 1,
        "categoryName": "乐事薯片"
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 10
  }
}
```

### 5.3.2 商品详情

- **接口**：`GET /api/products/{id}`
- **是否需要认证**：否
- **路径参数**：`id` - 商品ID
- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "name": "乐事原味薯片",
    "subtitle": "经典原味 酥脆可口",
    "description": "乐事经典原味薯片，选用优质土豆...",
    "price": 8.50,
    "originalPrice": 12.00,
    "stock": 500,
    "sales": 1520,
    "mainImage": "/images/products/lays-original.jpg",
    "images": ["/images/products/lays-1.jpg", "/images/products/lays-2.jpg"],
    "brand": "乐事",
    "flavor": "原味",
    "weight": "70g",
    "categoryId": 1,
    "categoryName": "乐事薯片",
    "isHot": 1,
    "extInfo": {
      "sugar_free": false,
      "spicy_level": 0
    }
  }
}
```

### 5.3.3 AI图像识别

- **接口**：`POST /api/products/recognize`
- **是否需要认证**：是
- **请求类型**：`multipart/form-data`
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | File | 是 | 图片文件 |

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "detections": [
      {
        "classId": 0,
        "className": "乐事薯片",
        "classNameEn": "Lay's",
        "confidence": 0.956,
        "bbox": [120, 80, 340, 290]
      }
    ],
    "products": [
      {
        "id": 1,
        "name": "乐事原味薯片",
        "price": 8.50,
        "mainImage": "...",
        "confidence": 0.956
      }
    ],
    "recommendations": [
      {
        "id": 5,
        "name": "乐事黄瓜味薯片",
        "price": 8.50,
        "mainImage": "..."
      }
    ],
    "processingTimeMs": 145
  }
}
```

### 5.3.4 获取分类列表

- **接口**：`GET /api/products/categories`
- **是否需要认证**：否
- **响应**：返回所有商品分类（树形结构）

## 5.4 订单服务接口（Order Service :8091）

### 5.4.1 创建订单

- **接口**：`POST /api/orders`
- **是否需要认证**：是
- **请求体**：

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ],
  "addressId": 1,
  "remark": "请尽快发货"
}
```

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "orderId": 10001,
    "orderNo": "202606261234567890",
    "totalAmount": 17.00,
    "payAmount": 17.00,
    "status": 1,
    "idempotentToken": "uuid-xxx-yyy"
  }
}
```

### 5.4.2 订单列表

- **接口**：`GET /api/orders`
- **是否需要认证**：是
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| pageNum | Integer | 否 | 页码 |
| pageSize | Integer | 否 | 每页条数 |
| status | Integer | 否 | 订单状态筛选 |

### 5.4.3 订单详情

- **接口**：`GET /api/orders/{id}`
- **是否需要认证**：是
- **响应**：返回订单详情及订单明细

### 5.4.4 取消订单

- **接口**：`PUT /api/orders/{id}/cancel`
- **是否需要认证**：是
- **说明**：仅待付款状态可取消

### 5.4.5 获取推荐商品

- **接口**：`GET /api/orders/recommend`
- **是否需要认证**：是
- **请求参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| userId | Long | 是 | - | 用户ID |
| k | Integer | 否 | 20 | 推荐数量 |

- **说明**：调用DIN推荐服务获取个性化推荐

## 5.5 支付服务接口（Payment Service :8084）

### 5.5.1 创建支付

- **接口**：`POST /api/payments`
- **是否需要认证**：是
- **请求体**：

```json
{
  "orderId": 10001,
  "payType": 1,
  "idempotentToken": "uuid-xxx-yyy"
}
```

### 5.5.2 支付详情

- **接口**：`GET /api/payments/{id}`
- **是否需要认证**：是

### 5.5.3 支付回调

- **接口**：`POST /api/payments/callback`
- **是否需要认证**：否（第三方回调）
- **说明**：第三方支付平台回调接口

## 5.6 YOLO识别服务接口（:8086）

### 5.6.1 图像识别

- **接口**：`POST /api/recognize`
- **请求类型**：`multipart/form-data`
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| file | File | 是 | 图片文件 |
| conf | Float | 否 | 置信度阈值，默认0.5 |

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "detections": [
      {
        "classId": 0,
        "className": "Lay's",
        "classNameCn": "乐事薯片",
        "confidence": 0.956,
        "bbox": {
          "x1": 120,
          "y1": 80,
          "x2": 340,
          "y2": 290
        }
      }
    ],
    "processingTimeMs": 145,
    "modelVersion": "yolov11-v1"
  }
}
```

### 5.6.2 健康检查

- **接口**：`GET /health`
- **响应**：

```json
{
  "status": "healthy",
  "modelLoaded": true,
  "modelVersion": "yolov11-v1"
}
```

### 5.6.3 获取支持类别

- **接口**：`GET /api/classes`
- **响应**：返回19个支持识别的类别列表

## 5.7 DIN推荐服务接口（:8000）

### 5.7.1 获取Top-K推荐

- **接口**：`GET /api/recommend/topk`
- **请求参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| userId | Long | 是 | - | 用户ID |
| k | Integer | 否 | 40 | 推荐数量 |
| onlyCached | Boolean | 否 | true | 仅使用缓存 |

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "userId": 123,
    "items": [
      {
        "itemId": 5001,
        "score": 0.9234,
        "rank": 1,
        "reason": "cache hit with business rerank"
      }
    ],
    "modelVersion": "v1",
    "hitCache": true,
    "latencyMs": 15
  }
}
```

### 5.7.2 兼容旧版推荐接口

- **接口**：`POST /api/recommend`
- **请求体**：

```json
{
  "userId": 123
}
```

- **响应**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "recommendList": [5001, 5002, 5003]
  }
}
```

### 5.7.3 获取示例用户ID

- **接口**：`GET /api/recommend/users/sample`
- **请求参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|------|-------|------|
| n | Integer | 否 | 10 | 返回数量 |
| onlyCached | Boolean | 否 | true | 仅缓存用户 |

### 5.7.4 健康检查

- **接口**：`GET /health`

## 5.8 KBQA问答服务接口（:8087）

### 5.8.1 知识问答

- **接口**：`POST /api/qa/ask`
- **请求体**：

```json
{
  "question": "推荐一款辣味薯片",
  "sessionId": "uuid-session-id"
}
```

- **响应示例**：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "answer": "为您推荐辣味薯片：多力多滋香辣味玉米片（¥9.90）、Cheetoz辣味（¥7.50）",
    "entities": [
      {"name": "薯片", "type": "Category", "id": 1},
      {"name": "辣味", "type": "Flavor", "id": 2}
    ],
    "intent": "recommend",
    "cypher": "MATCH (p:Product)-[:HAS_FLAVOR]->(f:Flavor) WHERE f.spicyLevel >= 2 RETURN p ORDER BY p.sales DESC LIMIT 5",
    "products": [
      {"id": 15, "name": "多力多滋香辣味", "price": 9.90}
    ],
    "confidence": 0.92
  }
}
```

### 5.8.2 图谱查询

- **接口**：`POST /api/qa/query`
- **请求体**：

```json
{
  "cypher": "MATCH (p:Product)-[:BELONGS_TO]->(c:Category {name: '乐事薯片'}) RETURN p LIMIT 10"
}
```

### 5.8.3 健康检查

- **接口**：`GET /health`

## 5.9 前端页面路由

| 页面 | 路由 | 方法 |
|-----|------|------|
| 首页 | / | GET |
| 登录 | /login | GET/POST |
| 商品列表 | /products | GET |
| 商品详情 | /products/[id] | GET |
| AI识别 | /recognize | GET/POST |
| 购物车 | /cart | GET |
| 订单列表 | /orders | GET |
| 订单详情 | /orders/[id] | GET |
| 用户中心 | /profile | GET |

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
