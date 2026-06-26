# 知识图谱问答 API 文档

## 1. 接口说明

知识图谱问答（KG QA）服务由 RAG4Pro 的 Python Flask 应用提供，通过 Gateway 统一暴露为 `/api/kg/**`。

- **基础路径**：`http://localhost:8080/api/kg`
- **鉴权方式**：`Authorization: Bearer <JWT>`
- **下游服务**：`http://127.0.0.1:5000`
- **Content-Type**：`application/json`

---

## 2. 问答接口

### POST /api/kg/query

自然语言问答接口，优先基于 Neo4j 知识图谱回答，未命中时返回 `hit: false`，由调用方决定是否走大模型兜底。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question` | string | 是 | 用户问题，长度不超过 200 字符 |

#### 请求示例

```bash
curl -X POST http://localhost:8080/api/kg/query \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "Ashi Mashi 经典零食多少钱？"}'
```

#### 响应参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `hit` | boolean | 是否命中图谱 |
| `answer` | string \| null | 命中时的答案，未命中时为 null |
| `source` | string | 固定为 `"neo4j"` |
| `intent` | string | 识别到的意图，如 `query_attr` |
| `attr_name` | string \| null | 属性名，如 `价格`、`库存`、`类目` |
| `entities` | array | 识别到的实体列表 |
| `matched_brand` | string \| null | 匹配到的品牌 |
| `matched_category` | string \| null | 匹配到的类目 |
| `matched_product` | string \| null | 匹配到的商品 |

#### 响应示例（命中）

```json
{
  "answer": "Ashi Mashi 经典零食的价格是 ¥12.9。",
  "hit": true,
  "source": "neo4j",
  "intent": "query_attr",
  "attr_name": "价格",
  "entities": [
    { "name": "Ashi Mashi 经典零食", "type": "Product" }
  ],
  "matched_brand": null,
  "matched_category": null,
  "matched_product": "Ashi Mashi 经典零食"
}
```

#### 响应示例（未命中）

```json
{
  "answer": null,
  "hit": false,
  "source": "neo4j",
  "intent": "query_attr",
  "attr_name": null,
  "entities": [],
  "matched_brand": null,
  "matched_category": null,
  "matched_product": null
}
```

---

## 3. 推荐接口

### POST /api/kg/recommend

基于匹配到的类目或商品，返回关联商品推荐列表。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | string | 否 | 类目名称，与 `product` 二选一 |
| `product` | string | 否 | 商品名称，与 `category` 二选一 |
| `top_k` | int | 否 | 返回数量，默认 3，最大 20 |

#### 请求示例

```bash
curl -X POST http://localhost:8080/api/kg/recommend \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"category": "Chee pellet 番茄酱味", "top_k": 3}'
```

#### 响应参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `items` | array | 推荐商品列表 |

#### 响应示例

```json
{
  "items": [
    {
      "id": 2,
      "name": "Chee pellet 番茄酱味",
      "price": 8.5,
      "image_url": "..."
    }
  ]
}
```

---

## 4. 支持的问题类型

| 类型 | 示例问题 | 答案来源 |
|------|----------|----------|
| 商品价格 | "Ashi Mashi 经典零食多少钱？" | Neo4j `Product.price` |
| 商品库存 | "Ashi Mashi 经典零食有没有货？" | Neo4j `Product.stock` |
| 商品销量 | "Cheetoz 辣椒味薯片销量怎么样？" | Neo4j `Product.sales` |
| 类目归属 | "Maz Maz 土豆条属于哪个类目？" | Neo4j `BELONGS_TO_CATEGORY` |
| 类目商品 | "Chee pellet 番茄酱味类目下有哪些商品？" | Neo4j `BELONGS_TO_CATEGORY` |
| 价格筛选 | "有哪些商品10元以下？" | Neo4j `Product.price <= X` |
| 开放性问题 | "你好" | 由 Next.js 调用 DeepSeek 兜底 |

---

## 5. 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 成功 |
| 400 | 请求参数错误，如缺少 `question` 或长度超过 200 |
| 401 | 未携带 JWT 或 Token 无效/过期 |
| 500 | 下游服务异常 |

---

## 6. 相关配置

### 6.1 Gateway 路由

```yaml
- id: shop-kg-service
  uri: http://127.0.0.1:5000
  predicates:
    - Path=/api/kg/**
  filters:
    - RewritePath=/api/kg/(?<segment>.*), /$\{segment}
```

### 6.2 Next.js 环境变量

```env
KG_QA_API_URL=http://localhost:8080/api/kg/query
```

### 6.3 Python 环境变量

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=12345678
KBOQA_API_PORT=5000
```
