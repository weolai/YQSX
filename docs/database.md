# 数据库设计规范

## 数据库架构

### 微服务数据库隔离

每个微服务独立数据库，避免跨服务直接访问数据库。

```
shop-product    → 商品数据库
shop-order      → 订单数据库
shop-user       → 用户数据库
shop-payment    → 支付数据库
shop-inventory  → 库存数据库
```

### 数据库版本

- MySQL 8.0+
- 字符集：utf8mb4
- 排序规则：utf8mb4_general_ci
- 时区：Asia/Shanghai

## 命名规范

### 数据库命名

格式：`{项目名}-{服务名}`

示例：
```
shop-product
shop-order
shop-user
```

### 表命名

**规则**：
- 前缀：`t_`
- 格式：`t_{模块}_{功能}`
- 小写字母，单词间用下划线分隔
- 见名知意，不超过30字符

**示例**：
```sql
t_product          -- 商品表
t_product_category -- 商品分类表
t_order            -- 订单表
t_order_item       -- 订单明细表
t_user             -- 用户表
t_user_address     -- 用户地址表
```

### 字段命名

**规则**：
- 小写字母，单词间用下划线分隔
- 不使用保留字
- 见名知意
- 布尔字段：`is_` 开头

**示例**：
```sql
id                -- 主键
user_id           -- 用户ID
user_name         -- 用户名
product_name      -- 商品名称
product_price     -- 商品价格
is_deleted        -- 是否删除
is_enabled        -- 是否启用
create_time       -- 创建时间
update_time       -- 更新时间
```

### 索引命名

**规则**：
- 主键索引：`pk_{表名}`
- 唯一索引：`uk_{表名}_{字段名}`
- 普通索引：`idx_{表名}_{字段名}`
- 联合索引：`idx_{表名}_{字段1}_{字段2}`

**示例**：
```sql
pk_product                    -- 主键索引
uk_user_mobile                -- 唯一索引
idx_order_user_id             -- 普通索引
idx_order_user_id_create_time -- 联合索引
```

## 字段规范

### 主键设计

**推荐**：
```sql
id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID'
PRIMARY KEY (id)
```

**禁止**：
- 使用业务字段作为主键
- 使用UUID作为主键（性能差）

**分布式主键**：
- 雪花算法（Snowflake）
- 美团Leaf
- 百度UidGenerator

### 必备字段

每张表必须包含以下字段：

```sql
CREATE TABLE t_example (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    
    -- 业务字段
    -- ...
    
    -- 必备字段
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='示例表';
```

### 字段类型选择

| 数据类型 | 适用场景 | 示例 |
|---------|---------|------|
| TINYINT | 状态、标志位 | is_deleted, status |
| INT | 数量、计数 | stock, view_count |
| BIGINT | ID、大数值 | id, user_id |
| DECIMAL(M,D) | 金额、精确数值 | price DECIMAL(10,2) |
| VARCHAR(N) | 变长字符串 | name VARCHAR(50) |
| TEXT | 长文本 | description TEXT |
| DATETIME | 日期时间 | create_time |
| JSON | JSON数据 | ext_info JSON |

**注意**：
- 金额字段必须使用 DECIMAL，禁止使用 FLOAT/DOUBLE
- 字符串长度合理设置，避免过大浪费空间
- 日期时间使用 DATETIME，不使用 TIMESTAMP（范围限制）

### 字段约束

**NOT NULL**：
- 尽量设置 NOT NULL
- 提供合理的默认值
- NULL值会导致索引、统计等问题

**DEFAULT**：
- 字符串：`DEFAULT ''`
- 数值：`DEFAULT 0`
- 时间：`DEFAULT CURRENT_TIMESTAMP`
- 状态：`DEFAULT 1`（根据业务）

**COMMENT**：
- 所有字段必须添加注释
- 枚举值必须注明含义

示例：
```sql
status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用，3-删除'
```

## 索引设计

### 索引原则

1. **选择性高的字段**创建索引
2. **频繁查询**的字段创建索引
3. **WHERE、ORDER BY、GROUP BY**涉及的字段
4. **JOIN**关联字段
5. 区分度低的字段不建索引（如性别）
6. 频繁更新的字段慎重建索引

### 索引类型

**主键索引**：
```sql
PRIMARY KEY (id)
```

**唯一索引**：
```sql
UNIQUE KEY uk_user_mobile (mobile)
```

**普通索引**：
```sql
KEY idx_order_user_id (user_id)
```

**联合索引**：
```sql
KEY idx_order_user_status (user_id, status, create_time)
```

**全文索引**：
```sql
FULLTEXT KEY ft_product_name (name)
```

### 联合索引最左前缀原则

索引 `idx_order_user_status (user_id, status, create_time)`

**可以使用索引**：
```sql
WHERE user_id = 1
WHERE user_id = 1 AND status = 1
WHERE user_id = 1 AND status = 1 AND create_time > '2026-01-01'
```

**无法使用索引**：
```sql
WHERE status = 1
WHERE create_time > '2026-01-01'
WHERE status = 1 AND create_time > '2026-01-01'
```

### 索引优化建议

1. **控制索引数量**：单表索引不超过5个
2. **索引字段顺序**：区分度高的在前
3. **避免冗余索引**：`(a)` 和 `(a,b)` 存在，`(a)` 冗余
4. **字符串索引长度**：使用前缀索引，如 `KEY idx_name (name(20))`
5. **覆盖索引**：查询字段全部在索引中，避免回表

## 表设计规范

### 商品表 (t_product)

```sql
CREATE TABLE t_product (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '商品ID',
    category_id BIGINT NOT NULL COMMENT '分类ID',
    spu_code VARCHAR(50) NOT NULL COMMENT 'SPU编码',
    sku_code VARCHAR(50) NOT NULL COMMENT 'SKU编码',
    name VARCHAR(200) NOT NULL COMMENT '商品名称',
    subtitle VARCHAR(500) DEFAULT '' COMMENT '商品副标题',
    description TEXT COMMENT '商品描述',
    price DECIMAL(10,2) NOT NULL COMMENT '商品价格',
    original_price DECIMAL(10,2) NOT NULL COMMENT '原价',
    stock INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    sales INT NOT NULL DEFAULT 0 COMMENT '销量',
    main_image VARCHAR(500) DEFAULT '' COMMENT '主图URL',
    images TEXT COMMENT '商品图片JSON数组',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-上架，2-下架，3-售罄',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    is_hot TINYINT NOT NULL DEFAULT 0 COMMENT '是否热门：0-否，1-是',
    is_new TINYINT NOT NULL DEFAULT 0 COMMENT '是否新品：0-否，1-是',
    is_recommend TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐：0-否，1-是',
    ext_info JSON COMMENT '扩展信息',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_sku_code (sku_code),
    KEY idx_category_id (category_id),
    KEY idx_status_sort (status, sort_order),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';
```

### 订单表 (t_order)

```sql
CREATE TABLE t_order (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    username VARCHAR(50) DEFAULT '' COMMENT '用户名',
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
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_user_id (user_id),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

### 订单明细表 (t_order_item)

```sql
CREATE TABLE t_order_item (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    product_id BIGINT NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    product_image VARCHAR(500) DEFAULT '' COMMENT '商品图片',
    product_price DECIMAL(10,2) NOT NULL COMMENT '商品单价',
    quantity INT NOT NULL COMMENT '购买数量',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '小计金额',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    KEY idx_order_id (order_id),
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';
```

### 用户表 (t_user)

```sql
CREATE TABLE t_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码（加密）',
    nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
    mobile VARCHAR(20) DEFAULT '' COMMENT '手机号',
    email VARCHAR(100) DEFAULT '' COMMENT '邮箱',
    avatar VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    gender TINYINT NOT NULL DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
    birthday DATE DEFAULT NULL COMMENT '生日',
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '余额',
    points INT NOT NULL DEFAULT 0 COMMENT '积分',
    level TINYINT NOT NULL DEFAULT 1 COMMENT '会员等级',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用',
    last_login_time DATETIME DEFAULT NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) DEFAULT '' COMMENT '最后登录IP',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_mobile (mobile),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

## 查询优化

### SQL优化原则

1. **避免SELECT ***：明确指定需要的字段
2. **避免WHERE子句中使用函数**：导致索引失效
3. **避免隐式类型转换**：`WHERE id = '1'`（id为数字类型）
4. **使用LIMIT分页**：避免全表扫描
5. **避免OR条件**：改用IN或UNION
6. **小表驱动大表**：JOIN时小表在前
7. **避免子查询**：改用JOIN

### 慢查询示例与优化

**❌ 错误**：
```sql
-- 使用函数导致索引失效
SELECT * FROM t_order WHERE DATE(create_time) = '2026-06-01';

-- SELECT *
SELECT * FROM t_product WHERE status = 1;

-- 隐式类型转换
SELECT * FROM t_user WHERE id = '123';
```

**✅ 正确**：
```sql
-- 避免使用函数
SELECT * FROM t_order 
WHERE create_time >= '2026-06-01 00:00:00' 
  AND create_time < '2026-06-02 00:00:00';

-- 明确字段
SELECT id, name, price, stock FROM t_product WHERE status = 1;

-- 类型匹配
SELECT * FROM t_user WHERE id = 123;
```

### 分页优化

**❌ 深度分页问题**：
```sql
-- 偏移量过大，性能差
SELECT * FROM t_order ORDER BY id LIMIT 100000, 20;
```

**✅ 使用ID范围**：
```sql
-- 记录上次最大ID
SELECT * FROM t_order WHERE id > 100000 ORDER BY id LIMIT 20;
```

**✅ 使用子查询**：
```sql
-- 先查ID再JOIN
SELECT o.* FROM t_order o
INNER JOIN (
    SELECT id FROM t_order ORDER BY id LIMIT 100000, 20
) t ON o.id = t.id;
```

## 分库分表

### 分表策略

**按时间分表**（订单表）：
```
t_order_202601
t_order_202602
t_order_202603
```

**按ID取模分表**（用户表）：
```
t_user_0
t_user_1
t_user_2
t_user_3
```

### 分库策略

**按业务分库**：
```
shop_product_db
shop_order_db
shop_user_db
```

**按用户分库**：
```
shop_user_db_0
shop_user_db_1
shop_user_db_2
```

### 分库分表中间件

推荐使用：
- **ShardingSphere**：功能强大，社区活跃
- **MyCat**：老牌分库分表中间件

## 事务管理

### 事务隔离级别

MySQL默认：**REPEATABLE READ**（可重复读）

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|-----|----------|-----|
| READ UNCOMMITTED | 是 | 是 | 是 |
| READ COMMITTED | 否 | 是 | 是 |
| REPEATABLE READ | 否 | 否 | 是 |
| SERIALIZABLE | 否 | 否 | 否 |

### 分布式事务

**Seata AT模式**：
```java
@GlobalTransactional(rollbackFor = Exception.class)
public void createOrder(OrderDTO dto) {
    // 1. 创建订单
    orderMapper.insert(order);
    
    // 2. 扣减库存（远程调用）
    productService.deductStock(dto.getProductId(), dto.getQuantity());
    
    // 3. 扣减余额（远程调用）
    userService.deductBalance(dto.getUserId(), dto.getAmount());
}
```

## 数据备份

### 备份策略

**全量备份**：
```bash
# 每天凌晨2点
0 2 * * * /usr/bin/mysqldump -u root -p*** --all-databases > /backup/mysql_full_$(date +\%Y\%m\%d).sql
```

**增量备份**：
```bash
# 每小时
0 * * * * /usr/bin/mysqldump -u root -p*** --all-databases --single-transaction > /backup/mysql_inc_$(date +\%Y\%m\%d\%H).sql
```

### 恢复策略

```bash
# 恢复全量备份
mysql -u root -p*** < /backup/mysql_full_20260618.sql

# 恢复增量备份
mysql -u root -p*** < /backup/mysql_inc_2026061810.sql
```

## 性能监控

### 慢查询日志

配置 `my.cnf`：
```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = 1
```

### 分析慢查询

```bash
# 使用mysqldumpslow分析
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
```

### EXPLAIN分析

```sql
EXPLAIN SELECT * FROM t_order WHERE user_id = 123;
```

关键字段：
- **type**：ALL（全表扫描）< index < range < ref < eq_ref < const
- **key**：实际使用的索引
- **rows**：扫描行数
- **Extra**：额外信息

## 数据安全

### 敏感数据加密

**密码**：
- 使用BCrypt、Argon2等单向加密
- 禁止明文或简单MD5

**手机号、身份证**：
- AES对称加密
- 密钥统一管理

### 权限控制

**最小权限原则**：
```sql
-- 应用账号只给DML权限
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_product.* TO 'app_user'@'%';

-- 禁止DROP、TRUNCATE权限
```

### SQL注入防护

**❌ 错误**：
```java
// 拼接SQL，存在注入风险
String sql = "SELECT * FROM t_user WHERE username = '" + username + "'";
```

**✅ 正确**：
```java
// 使用预编译，防止注入
String sql = "SELECT * FROM t_user WHERE username = ?";
PreparedStatement ps = conn.prepareStatement(sql);
ps.setString(1, username);
```

## 注意事项

1. **禁止在线DDL**：变更表结构使用pt-online-schema-change
2. **禁止大事务**：拆分为小事务，避免锁等待
3. **禁止跨库JOIN**：微服务架构下通过服务调用
4. **监控连接池**：合理设置最大连接数
5. **定期清理数据**：归档历史数据，保持表数据量在合理范围

## 参考资料

- [MySQL官方文档](https://dev.mysql.com/doc/)
- [阿里巴巴Java开发手册-MySQL规约](https://github.com/alibaba/p3c)
- [高性能MySQL](https://book.douban.com/subject/23008813/)
