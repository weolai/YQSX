# KBQA知识图谱问答模块设计

![KBQA问答流程图](assets/kbqa-flow.png)

## 8.1 模块概述

### 8.1.1 功能定位

KBQA（Knowledge Base Question Answering）模块基于商品知识图谱，支持用户以自然语言提问，通过实体识别、意图理解和图查询，精准返回商品相关答案，提供智能客服式购物咨询体验。

### 8.1.2 技术选型

| 技术 | 版本 | 选型理由 |
|-----|------|---------|
| Neo4j | 5.x+ | 原生图数据库，Cypher查询语言，关系 traversal 性能优秀 |
| Flask | 2.x+ | 轻量级Web API框架 |
| py2neo | 2021.x | Neo4j Python驱动，OGM支持 |
| Python | 3.10+ | NLP生态完善 |

### 8.1.3 支持的问题类型

| 问题类型 | 示例 | 返回内容 |
|---------|------|---------|
| 商品推荐 | "推荐一款辣味薯片" | 推荐商品列表 |
| 属性查询 | "乐事薯片多少钱" | 商品价格、规格 |
| 类目查询 | "有哪些薯片品牌" | 品牌列表 |
| 条件筛选 | "无糖的零食有哪些" | 符合条件商品 |
| 比较问题 | "乐事和多力多滋哪个贵" | 对比信息 |
| 品牌查询 | "乐事有哪些口味" | 品牌下商品 |

## 8.2 知识图谱设计

### 8.2.1 本体设计（Ontology）

**节点类型：**

| 节点标签 | 属性 | 说明 |
|---------|------|------|
| Product | productId, name, price, sales, stock, isHot | 商品节点 |
| Category | categoryId, name, nameEn | 商品分类 |
| Brand | brandId, name, country | 品牌 |
| Flavor | flavorId, name, spicyLevel | 口味 |
| Attribute | attrId, name, value | 属性（含糖、过敏原等） |

**关系类型：**

| 关系 | 起点 → 终点 | 属性 | 说明 |
|-----|------------|------|------|
| BELONGS_TO | Product → Category | - | 属于某分类 |
| PRODUCED_BY | Product → Brand | - | 由某品牌生产 |
| HAS_FLAVOR | Product → Flavor | - | 具有某口味 |
| HAS_ATTRIBUTE | Product → Attribute | - | 具有某属性 |
| SIMILAR_TO | Product → Product | similarity | 相似商品 |
| BOUGHT_TOGETHER | Product → Product | count | 经常一起购买 |
| SUB_CATEGORY | Category → Category | - | 子分类关系 |

### 8.2.2 图谱构建

```python
# 从MySQL同步商品数据到Neo4j
def sync_products_to_neo4j():
    # 1. 查询MySQL商品数据
    products = productMapper.selectList(...)
    categories = categoryMapper.selectList(...)
    
    # 2. 创建分类节点
    for cat in categories:
        graph.run("""
            MERGE (c:Category {categoryId: $id})
            SET c.name = $name, c.nameEn = $nameEn
        """, id=cat.id, name=cat.name, nameEn=cat.name_en)
    
    # 3. 创建品牌节点
    # 4. 创建商品节点
    for p in products:
        graph.run("""
            MERGE (p:Product {productId: $id})
            SET p.name = $name, p.price = $price, p.sales = $sales
        """, id=p.id, name=p.name, price=p.price, sales=p.sales)
        
        # 5. 创建关系
        graph.run("""
            MATCH (p:Product {productId: $pid}), (c:Category {categoryId: $cid})
            MERGE (p)-[:BELONGS_TO]->(c)
        """, pid=p.id, cid=p.category_id)
        
        graph.run("""
            MATCH (p:Product {productId: $pid}), (b:Brand {name: $brand})
            MERGE (p)-[:PRODUCED_BY]->(b)
        """, pid=p.id, brand=p.brand)
```

### 8.2.3 索引与约束

```cypher
-- 唯一约束
CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.productId IS UNIQUE;
CREATE CONSTRAINT category_id IF NOT EXISTS FOR (c:Category) REQUIRE c.categoryId IS UNIQUE;
CREATE CONSTRAINT brand_id IF NOT EXISTS FOR (b:Brand) REQUIRE b.brandId IS UNIQUE;

-- 索引（加速查询）
CREATE INDEX product_name IF NOT EXISTS FOR (p:Product) ON (p.name);
CREATE INDEX category_name IF NOT EXISTS FOR (c:Category) ON (c.name);
CREATE INDEX brand_name IF NOT EXISTS FOR (b:Brand) ON (b.name);
```

## 8.3 KBQA问答流程

### 8.3.1 整体流程

```
用户问题: "推荐一款辣味薯片"
    ↓
1. 问题预处理
   └─ 分词、去停用词、同义词替换
    ↓
2. 实体识别（NER）
   └─ 识别实体: "薯片"→Category, "辣味"→Flavor
    ↓
3. 实体链接（Entity Linking）
   └─ 链接到Neo4j节点: Category(name="薯片"), Flavor(name="辣味")
    ↓
4. 意图识别（Intent Classification）
   └─ 意图: "recommend"（推荐）
    ↓
5. Cypher查询生成
   └─ MATCH (p:Product)-[:BELONGS_TO]->(c:Category {name:'薯片'})
      MATCH (p)-[:HAS_FLAVOR]->(f:Flavor {spicyLevel: >=2})
      RETURN p ORDER BY p.sales DESC LIMIT 5
    ↓
6. 执行图查询
   └─ Neo4j返回商品列表
    ↓
7. 答案生成
   └─ "为您推荐辣味薯片：多力多滋香辣味（¥9.90）、..."
```

### 8.3.2 实体识别（NER）

采用基于词典+规则的NER方法（垂直领域可控且准确）：

```python
class NerEntityLinker:
    def __init__(self, graph):
        self.graph = graph
        # 加载实体词典
        self.category_dict = self._load_categories()
        self.brand_dict = self._load_brands()
        self.flavor_dict = self._load_flavors()
        self.attribute_dict = {"无糖": "sugar_free=true", "辣": "spicy"}
        
        # Trie树加速匹配
        self.trie = self._build_trie()
    
    def extract_entities(self, question: str) -> List[Entity]:
        entities = []
        # 1. Trie树最大匹配
        matches = self.trie.max_match(question)
        
        # 2. 对每个匹配项确定实体类型
        for match_text, start, end in matches:
            if match_text in self.category_dict:
                entities.append(Entity(name=match_text, type="Category", 
                                       id=self.category_dict[match_text]))
            elif match_text in self.brand_dict:
                entities.append(Entity(name=match_text, type="Brand",
                                       id=self.brand_dict[match_text]))
            elif match_text in self.flavor_dict:
                entities.append(Entity(name=match_text, type="Flavor",
                                       id=self.flavor_dict[match_text]))
        
        return entities
```

### 8.3.3 意图识别

基于关键词匹配+模板匹配：

```python
INTENT_PATTERNS = {
    "recommend": ["推荐", "有什么", "哪些", "建议"],
    "query_price": ["多少钱", "价格", "贵不贵"],
    "query_brand": ["品牌", "哪个牌子", "什么牌子"],
    "query_flavor": ["口味", "味道", "辣不辣"],
    "filter_attribute": ["无糖", "低糖", "不含", "有哪些"],
    "compare": ["和", "哪个", "对比", "比较"]
}

def classify_intent(question: str, entities: List[Entity]) -> str:
    for intent, keywords in INTENT_PATTERNS.items():
        for kw in keywords:
            if kw in question:
                return intent
    return "recommend"  # 默认推荐
```

### 8.3.4 Cypher模板

根据意图+实体类型选择查询模板：

```python
CYPHER_TEMPLATES = {
    # 按分类推荐
    ("recommend", "Category"): """
        MATCH (p:Product)-[:BELONGS_TO]->(c:Category {categoryId: $cid})
        WHERE p.status = 1
        RETURN p.productId as id, p.name as name, p.price as price, p.sales as sales
        ORDER BY p.sales DESC LIMIT 10
    """,
    
    # 按分类+口味推荐
    ("recommend", "Category+Flavor"): """
        MATCH (p:Product)-[:BELONGS_TO]->(c:Category {name: $catName})
        MATCH (p)-[:HAS_FLAVOR]->(f:Flavor)
        WHERE f.spicyLevel >= $spicyLevel AND p.status = 1
        RETURN p.productId as id, p.name as name, p.price as price, p.sales as sales
        ORDER BY p.sales DESC LIMIT 10
    """,
    
    # 查询商品价格
    ("query_price", "Product"): """
        MATCH (p:Product {name: $productName})
        RETURN p.productId as id, p.name as name, p.price as price
    """,
    
    # 查询品牌下所有商品
    ("query_brand", "Brand"): """
        MATCH (p:Product)-[:PRODUCED_BY]->(b:Brand {name: $brandName})
        RETURN p.productId as id, p.name as name, p.price as price
        ORDER BY p.sales DESC LIMIT 20
    """,
    
    # 按属性筛选
    ("filter_attribute", "Attribute"): """
        MATCH (p:Product)-[:HAS_ATTRIBUTE]->(a:Attribute {name: $attrName})
        WHERE a.value = $attrValue AND p.status = 1
        RETURN p.productId as id, p.name as name, p.price as price
        ORDER BY p.sales DESC LIMIT 20
    """
}
```

### 8.3.5 查询执行

```python
class QueryEngine:
    def __init__(self, graph):
        self.graph = graph
    
    def execute(self, intent: str, entities: List[Entity]) -> QueryResult:
        # 1. 根据实体组合选择模板
        entity_types = "+".join(sorted([e.type for e in entities]))
        template_key = (intent, entity_types)
        
        if template_key not in CYPHER_TEMPLATES:
            # Fallback：模糊查询
            return self._fuzzy_query(entities)
        
        cypher = CYPHER_TEMPLATES[template_key]
        
        # 2. 构造参数
        params = self._build_params(entities, intent)
        
        # 3. 执行查询
        results = self.graph.run(cypher, **params).data()
        
        return QueryResult(
            intent=intent,
            entities=entities,
            cypher=cypher,
            products=results,
            confidence=self._calc_confidence(results)
        )
```

### 8.3.6 答案生成

基于模板的自然语言生成：

```python
ANSWER_TEMPLATES = {
    "recommend": "为您推荐以下{category}：\n{product_list}",
    "query_price": "{product_name}的价格是{price}元",
    "query_brand": "{brand}品牌有以下商品：\n{product_list}",
    "filter_attribute": "符合条件的商品有：\n{product_list}",
    "fallback": "抱歉，我暂时无法回答这个问题。您可以尝试问我关于零食推荐或商品信息的问题。"
}

def generate_answer(result: QueryResult) -> str:
    template = ANSWER_TEMPLATES.get(result.intent, ANSWER_TEMPLATES["fallback"])
    
    product_list_str = "\n".join([
        f"- {p['name']}（¥{p['price']:.2f}，销量{p['sales']}）"
        for p in result.products[:5]
    ])
    
    return template.format(
        category=result.entities[0].name if result.entities else "商品",
        product_list=product_list_str,
        product_name=result.products[0]['name'] if result.products else "",
        price=result.products[0]['price'] if result.products else "",
        brand=result.entities[0].name if result.entities else ""
    )
```

## 8.4 API服务

### 8.4.1 核心接口

见 `05_api_design.md` 5.8节。

### 8.4.2 问答示例

**请求：**
```json
POST /api/qa/ask
{
  "question": "推荐辣味薯片",
  "sessionId": "abc-123"
}
```

**响应：**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "answer": "为您推荐辣味薯片：\n- 多力多滋香辣味玉米片（¥9.90，销量3200）\n- Cheetoz辣味（¥7.50，销量2100）",
    "entities": [
      {"name": "薯片", "type": "Category", "id": 1},
      {"name": "辣味", "type": "Flavor", "id": 3}
    ],
    "intent": "recommend",
    "cypher": "MATCH (p:Product)-[:BELONGS_TO]->(c:Category {name:'薯片'}) MATCH (p)-[:HAS_FLAVOR]->(f:Flavor) WHERE f.spicyLevel >= 2 ...",
    "products": [
      {"id": 15, "name": "多力多滋香辣味", "price": 9.90, "sales": 3200}
    ],
    "confidence": 0.92
  }
}
```

### 8.4.3 数据同步接口

```python
@app.post('/api/admin/sync')
def sync_products():
    """从MySQL同步商品数据到Neo4j（管理端调用）"""
    sync_products_to_neo4j()
    return {"code": 200, "msg": "sync success"}
```

## 8.5 系统集成

### 8.5.1 前端集成

智能客服聊天组件：

```tsx
// ChatWidget.tsx
const ChatWidget = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const sendQuestion = async () => {
    const res = await axios.post('/api/qa/ask', { question: input });
    setMessages([...messages, 
      { role: 'user', content: input },
      { role: 'assistant', content: res.data.data.answer, products: res.data.data.products }
    ]);
  };
  
  return (
    <div className="chat-widget">
      <MessageList messages={messages} />
      <ProductCards products={lastMessage?.products} />
      <Input onSend={sendQuestion} />
    </div>
  );
};
```

### 8.5.2 前端接入位置

- 首页右下角悬浮智能客服入口
- 商品详情页"智能咨询"按钮
- AI识别结果页"了解更多"

## 8.6 优化方向

### 8.6.1 短期优化

- 扩展Cypher模板覆盖更多问题类型
- 完善同义词词典（如"薯片"="土豆片"="洋芋片"）
- 增加多轮对话支持（上下文记忆）
- 引入拼音纠错（容错处理）

### 8.6.2 长期优化

- 引入预训练语言模型（BERT）做NER和意图识别
- 使用Text2Cypher模型自动生成查询语句
- 用户反馈闭环（答案点赞/点踩数据用于优化）
- 支持语音输入

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
