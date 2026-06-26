# 数据库设计

![数据库ER图](assets/database-er.png)

## 4.1 数据库架构

### 4.1.1 设计原则

系统采用**微服务数据库隔离**原则，每个微服务拥有独立的数据库，服务间通过API调用进行数据交互，禁止跨服务直接访问数据库。

### 4.1.2 数据库清单

| 数据库 | 所属服务 | 存储内容 |
|-------|---------|---------|
| shop_product | 商品服务 | 商品信息、分类、库存 |
| shop_order | 订单服务 | 订单、订单明细 |
| shop_user | 用户服务 | 用户信息、收货地址 |
| shop_payment | 支付服务 | 支付记录 |
| Neo4j | KBQA服务 | 商品知识图谱（实体、关系） |

### 4.1.3 公共字段规范

所有业务表统一包含以下字段：

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | BIGINT AUTO_INCREMENT | 主键，自增 |
| is_deleted | TINYINT DEFAULT 0 | 逻辑删除：0-未删除，1-已删除 |
| create_time | DATETIME DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | DATETIME ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

## 4.2 商品数据库（shop_product）

### 4.2.1 商品分类表（t_category）

```sql
CREATE TABLE t_category (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '分类ID',
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    name_en VARCHAR(100) DEFAULT '' COMMENT '英文名称（对应YOLO类别）',
    parent_id BIGINT NOT NULL DEFAULT 0 COMMENT '父分类ID，0为一级分类',
    level TINYINT NOT NULL DEFAULT 1 COMMENT '分类层级：1-一级，2-二级',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    icon VARCHAR(500) DEFAULT '' COMMENT '分类图标URL',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-启用，2-禁用',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_parent_id (parent_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';
```

**初始数据（19个零食分类）：**

| ID | 名称 | 英文名称 |
|----|------|---------|
| 1 | 乐事薯片 | Lay's |
| 2 | 奇多玉米棒 | Cheetos |
| 3 | 多力多滋玉米片 | Doritos |
| 4 | Ashi Mashi | Ashi Mashi |
| 5 | Chee | Chee |
| 6 | Cheetoz | Cheetoz |
| 7 | Maz Maz | Maz Maz |
| 8 | Mini Lina | Mini Lina |
| 9 | Minoo | Minoo |
| 10 | Naderi | Naderi |
| ... | ... | ... |

### 4.2.2 商品表（t_product）

```sql
CREATE TABLE t_product (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '商品ID',
    category_id BIGINT NOT NULL COMMENT '分类ID',
    sku_code VARCHAR(50) NOT NULL COMMENT 'SKU编码',
    name VARCHAR(200) NOT NULL COMMENT '商品名称',
    subtitle VARCHAR(500) DEFAULT '' COMMENT '商品副标题',
    description TEXT COMMENT '商品描述',
    price DECIMAL(10,2) NOT NULL COMMENT '商品价格',
    original_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '原价',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    sales INT NOT NULL DEFAULT 0 COMMENT '销量',
    main_image VARCHAR(500) DEFAULT '' COMMENT '主图URL',
    images TEXT COMMENT '商品图片JSON数组',
    brand VARCHAR(100) DEFAULT '' COMMENT '品牌',
    flavor VARCHAR(50) DEFAULT '' COMMENT '口味',
    weight VARCHAR(50) DEFAULT '' COMMENT '规格/重量',
    is_hot TINYINT NOT NULL DEFAULT 0 COMMENT '是否热门：0-否，1-是',
    is_new TINYINT NOT NULL DEFAULT 0 COMMENT '是否新品：0-否，1-是',
    is_recommend TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐：0-否，1-是',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-上架，2-下架，3-售罄',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    ext_info JSON COMMENT '扩展属性（含糖量、过敏原等）',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_sku_code (sku_code),
    KEY idx_category_id (category_id),
    KEY idx_status_sort (status, sort_order),
    KEY idx_is_hot (is_hot),
    KEY idx_sales (sales)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';
```

**ext_info JSON结构示例：**
```json
{
  "sugar_free": false,
  "spicy_level": 2,
  "allergens": ["乳制品", "大豆"],
  "calories": 520,
  "shelf_life": "9个月"
}
```

## 4.3 用户数据库（shop_user）

### 4.3.1 用户表（t_user）

```sql
CREATE TABLE t_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码（BCrypt加密）',
    nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
    mobile VARCHAR(20) DEFAULT '' COMMENT '手机号',
    email VARCHAR(100) DEFAULT '' COMMENT '邮箱',
    avatar VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    gender TINYINT NOT NULL DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
    birthday DATE DEFAULT NULL COMMENT '生日',
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '账户余额',
    points INT NOT NULL DEFAULT 0 COMMENT '积分',
    level TINYINT NOT NULL DEFAULT 1 COMMENT '会员等级：1-普通，2-银卡，3-金卡',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用',
    last_login_time DATETIME DEFAULT NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) DEFAULT '' COMMENT '最后登录IP',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_mobile (mobile),
    KEY idx_status (status),
    KEY idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 4.3.2 用户行为表（t_user_behavior）

用于记录用户浏览、点击、收藏、购买行为，供DIN推荐使用。

```sql
CREATE TABLE t_user_behavior (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '行为ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    item_id BIGINT NOT NULL COMMENT '商品ID',
    item_category BIGINT NOT NULL COMMENT '商品分类ID',
    behavior_type TINYINT NOT NULL COMMENT '行为类型：1-浏览，2-点击，3-收藏，4-购买',
    behavior_time DATETIME NOT NULL COMMENT '行为时间',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id_time (user_id, behavior_time),
    KEY idx_item_id (item_id),
    KEY idx_behavior_type (behavior_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户行为表（推荐系统用）';
```

### 4.3.3 收货地址表（t_user_address）

```sql
CREATE TABLE t_user_address (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '地址ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    receiver_name VARCHAR(50) NOT NULL COMMENT '收货人',
    receiver_mobile VARCHAR(20) NOT NULL COMMENT '收货电话',
    province VARCHAR(50) NOT NULL COMMENT '省',
    city VARCHAR(50) NOT NULL COMMENT '市',
    district VARCHAR(50) NOT NULL COMMENT '区',
    detail_address VARCHAR(200) NOT NULL COMMENT '详细地址',
    is_default TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认：0-否，1-是',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货地址表';
```

## 4.4 订单数据库（shop_order）

### 4.4.1 订单表（t_order）

```sql
CREATE TABLE t_order (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号（时间戳+随机数）',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    username VARCHAR(50) DEFAULT '' COMMENT '用户名快照',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
    freight_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '运费',
    pay_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
    pay_type TINYINT DEFAULT NULL COMMENT '支付方式：1-微信，2-支付宝，3-余额',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '订单状态：1-待付款，2-待发货，3-待收货，4-已完成，5-已取消',
    remark VARCHAR(500) DEFAULT '' COMMENT '订单备注',
    receiver_name VARCHAR(50) NOT NULL COMMENT '收货人',
    receiver_mobile VARCHAR(20) NOT NULL COMMENT '收货电话',
    receiver_province VARCHAR(50) NOT NULL COMMENT '省',
    receiver_city VARCHAR(50) NOT NULL COMMENT '市',
    receiver_district VARCHAR(50) NOT NULL COMMENT '区',
    receiver_address VARCHAR(200) NOT NULL COMMENT '详细地址',
    pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
    delivery_time DATETIME DEFAULT NULL COMMENT '发货时间',
    receive_time DATETIME DEFAULT NULL COMMENT '收货时间',
    cancel_time DATETIME DEFAULT NULL COMMENT '取消时间',
    idempotent_token VARCHAR(100) DEFAULT NULL COMMENT '下单幂等Token',
    version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    UNIQUE KEY uk_idempotent_token (idempotent_token),
    KEY idx_user_id (user_id),
    KEY idx_status (status),
    KEY idx_create_time (create_time),
    KEY idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

### 4.4.2 订单明细表（t_order_item）

```sql
CREATE TABLE t_order_item (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称快照',
    product_image VARCHAR(500) DEFAULT '' COMMENT '商品图片快照',
    product_price DECIMAL(10,2) NOT NULL COMMENT '商品单价快照',
    quantity INT NOT NULL COMMENT '购买数量',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '小计金额',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';
```

## 4.5 支付数据库（shop_payment）

### 4.5.1 支付记录表（t_payment）

```sql
CREATE TABLE t_payment (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '支付ID',
    payment_no VARCHAR(50) NOT NULL COMMENT '支付单号',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    pay_type TINYINT NOT NULL DEFAULT 1 COMMENT '支付方式：1-微信，2-支付宝，3-余额',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '支付状态：1-待支付，2-已支付，3-已退款',
    third_party_no VARCHAR(100) DEFAULT '' COMMENT '第三方支付流水号',
    idempotent_token VARCHAR(100) COMMENT '幂等Token',
    pay_time DATETIME DEFAULT NULL COMMENT '支付完成时间',
    callback_time DATETIME DEFAULT NULL COMMENT '回调时间',
    callback_data TEXT COMMENT '回调原始数据',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_no (payment_no),
    UNIQUE KEY uk_idempotent_token (idempotent_token),
    KEY idx_order_id (order_id),
    KEY idx_user_id (user_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';
```

## 4.6 Neo4j知识图谱设计

### 4.6.1 节点类型

| 节点标签 | 属性 | 说明 |
|---------|------|------|
| Product | productId, name, price, brand, flavor | 商品节点 |
| Category | categoryId, name, nameEn | 分类节点 |
| Brand | brandId, name, country | 品牌节点 |
| Flavor | flavorId, name, spicyLevel | 口味节点 |
| Attribute | attrId, name, value | 属性节点 |

### 4.6.2 关系类型

| 关系类型 | 起点 | 终点 | 说明 |
|---------|------|------|------|
| BELONGS_TO | Product | Category | 商品属于某分类 |
| PRODUCED_BY | Product | Brand | 商品由某品牌生产 |
| HAS_FLAVOR | Product | Flavor | 商品具有某口味 |
| HAS_ATTRIBUTE | Product | Attribute | 商品具有某属性 |
| SIMILAR_TO | Product | Product | 商品相似关系 |
| BOUGHT_TOGETHER | Product | Product | 经常一起购买 |

### 4.6.3 Cypher建图示例

```cypher
// 创建分类节点
CREATE (c:Category {categoryId: 1, name: '乐事薯片', nameEn: "Lay's"});

// 创建品牌节点
CREATE (b:Brand {brandId: 1, name: '乐事', country: '美国'});

// 创建商品节点
CREATE (p:Product {
    productId: 101, 
    name: '乐事原味薯片', 
    price: 8.50, 
    brand: '乐事'
});

// 创建关系
CREATE (p)-[:BELONGS_TO]->(c);
CREATE (p)-[:PRODUCED_BY]->(b);
CREATE (p)-[:HAS_FLAVOR]->(:Flavor {name: '原味', spicyLevel: 0});
```

## 4.7 Redis数据设计

### 4.7.1 Key命名规范

格式：`{业务域}:{数据类型}:{唯一标识}`

| Key模式 | 类型 | TTL | 说明 |
|---------|------|-----|------|
| `user:token:{token}` | String | 2h | JWT Token黑名单 |
| `user:session:{userId}` | Hash | 2h | 用户会话信息 |
| `product:detail:{productId}` | String(JSON) | 30min | 商品详情缓存 |
| `product:stock:{productId}` | String | - | 商品库存（实时） |
| `order:lock:{userId}:{productId}` | String | 10s | 下单分布式锁 |
| `payment:token:{token}` | String | 5min | 支付幂等Token |
| `recommend:cache:v1:{userId}` | String | 24h | 推荐结果缓存 |
| `recommend:cache:sig` | String | - | 缓存HMAC签名 |

### 4.7.2 缓存策略

- **商品详情**：Cache Aside Pattern，更新时删除缓存
- **库存**：不缓存，直接查数据库（或使用Redis原子扣减）
- **推荐结果**：离线预计算，JSON+HMAC签名存储
- **用户Session**：滑动窗口续期，每次访问延长TTL

## 4.8 索引设计总结

| 表 | 索引名 | 字段 | 类型 | 用途 |
|---|-------|------|------|------|
| t_product | idx_category_id | category_id | 普通索引 | 按分类查询商品 |
| t_product | idx_status_sort | status, sort_order | 联合索引 | 上架商品排序 |
| t_order | idx_user_id | user_id | 普通索引 | 用户订单列表 |
| t_order | idx_user_status | user_id, status | 联合索引 | 用户按状态筛选订单 |
| t_order | uk_idempotent_token | idempotent_token | 唯一索引 | 下单幂等 |
| t_payment | uk_idempotent_token | idempotent_token | 唯一索引 | 支付幂等 |
| t_user_behavior | idx_user_id_time | user_id, behavior_time | 联合索引 | 用户历史行为序列 |

---

**文档版本**: v1.0  
**最后更新**: 2026-06-26
