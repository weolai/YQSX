# 性能优化修复方案文档（内存专项）

**日期**：2026-06-24  
**范围**：后端 `shop-parent` 全部服务 + 前端 `shop-web-next`  
**问题总数**：25 个（高 5 / 中 11 / 低 9）  
**状态**：方案设计阶段，未执行任何代码修改

---

## 目录

- [一、高优先级修复方案](#一高优先级修复方案)
  - [B1: RedisLockUtil 每次解锁新建 DefaultRedisScript](#b1-redislockutil-每次解锁新建-defaultredisscript)
  - [B2: Feign 未配置连接池](#b2-feign-未配置连接池)
  - [B3: MyBatis SQL 全量 stdout 输出](#b3-mybatis-sql-全量-stdout-输出)
  - [F1: URL.createObjectURL 内存泄漏](#f1-urlcreateobjecturl-内存泄漏)
  - [B4: OrderServiceImpl.findByUid N+1 Feign 调用](#b4-orderserviceimplfindbyuid-n1-feign-调用)
- [二、中优先级修复方案](#二中优先级修复方案)
  - [B5: HikariCP 数据库连接池未配置](#b5-hikicp-数据库连接池未配置)
  - [B6: Redis Lettuce 连接池未配置](#b6-redis-lettuce-连接池未配置)
  - [B7: VersionPriorityRule 每次请求创建中间集合](#b7-versionpriorityrule-每次请求创建中间集合)
  - [B8: VersionPriorityRule 每次请求 INFO 输出完整 metadata](#b8-versionpriorityrule-每次请求-info-输出完整-metadata)
  - [F2: snack-mascot.tsx setTimeout 未清除](#f2-snack-mascottsx-settimeout-未清除)
  - [F3: auth-fuse.tsx setTimeout 未清除](#f3-auth-fusetsx-settimeout-未清除)
  - [F4: typewriter.tsx 嵌套 setTimeout 未清除](#f4-typewritertsx-嵌套-settimeout-未清除)
  - [F5: floating-snacks.tsx THREE.js 材质未 dispose](#f5-floating-snackstsx-threejs-材质未-dispose)
  - [F6: floating-snacks.tsx import * as THREE](#f6-floating-snackstsx-import--as-three)
  - [B9: SmsCodeServiceImpl System.out.println](#b9-smscodeserviceimpl-systemoutprintln)
  - [F7: limelight-nav.tsx setTimeout 未清除](#f7-limelight-navtsx-settimeout-未清除)
- [三、低优先级修复方案](#三低优先级修复方案)
- [四、修复执行顺序与依赖关系](#四修复执行顺序与依赖关系)
- [五、风险评估](#五风险评估)

---

## 一、高优先级修复方案

### B1: RedisLockUtil 每次解锁新建 DefaultRedisScript

| 维度 | 内容 |
|------|------|
| **文件** | `shop-common/src/main/java/com/gec/shop/common/util/RedisLockUtil.java` |
| **行号** | 38-48 |
| **严重程度** | 高 |
| **影响路径** | 每次下单（OrderController）+ 每次支付（PaymentServiceImpl）的 finally 块 |

#### 问题分析

当前 `unlock` 方法每次调用都执行：
1. 拼接 Lua 脚本字符串（3 行字符串拼接）
2. `new DefaultRedisScript<>(script, Long.class)` 创建新对象

`DefaultRedisScript` 设计为可复用对象，内部缓存了脚本的 SHA1 摘要。复用时 Redis 客户端可使用 `EVALSHA` 命令仅发送 40 字节的哈希值而非完整脚本。每次新建会导致：
- SHA1 缓存失效，每次发送完整脚本（~120 字节）
- 额外的对象分配和 GC 压力
- Lua 脚本字符串拼接产生临时 String 对象

#### 修改逻辑

```java
// 提取为 static final 常量，类加载时创建一次
private static final DefaultRedisScript<Long> UNLOCK_SCRIPT = new DefaultRedisScript<>(
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "return redis.call('del', KEYS[1]) " +
        "else return 0 end",
        Long.class
);

public void unlock(String key, String value) {
    redisTemplate.execute(
            UNLOCK_SCRIPT,  // 复用常量
            Collections.singletonList(key),
            value
    );
}
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 每次 unlock 对象创建 | 1 个 DefaultRedisScript + 1 个 String | 0 |
| Redis 协议命令 | EVAL（发送完整脚本） | EVALSHA（仅发送 40 字节哈希） |
| 网络传输 | ~120 字节/次 | ~40 字节/次 |
| GC 压力 | 高频路径持续产生短生命周期对象 | 消除 |

#### 成本

1 行代码改动（提取常量），无功能影响。

---

### B2: Feign 未配置连接池

| 维度 | 内容 |
|------|------|
| **文件** | 各服务 `pom.xml` + `application.yml` |
| **严重程度** | 高 |
| **影响路径** | order→product、order→user、payment→order 等所有 Feign 调用 |

#### 问题分析

项目未引入 `feign-httpclient` 或 `feign-okhttp` 依赖，Feign 默认使用 `JDK HttpURLConnection`。`HttpURLConnection` 每次请求都创建新的 TCP 连接和 `Socket` 对象，无连接复用机制。

在高频服务间调用场景下（如订单创建时调用 product 服务扣减库存 + 调用 user 服务查询用户），每次调用都经历：
1. TCP 三次握手（~1ms 本地，跨网络更高）
2. 创建 Socket 对象 + 输入输出流
3. 请求完成后 TCP 四次挥手 + 对象回收

#### 修改逻辑

**步骤 1**：在 `shop-parent/pom.xml` 的 `<dependencyManagement>` 中添加版本管理（可选，Spring Cloud BOM 已管理）

**步骤 2**：在需要 Feign 调用的服务（order、payment）`pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>io.github.openfeign</groupId>
    <artifactId>feign-httpclient</artifactId>
</dependency>
```

**步骤 3**：在 `application.yml` 中配置连接池参数：

```yaml
feign:
  httpclient:
    enabled: true
    max-connections: 200        # 最大连接数
    max-connections-per-route: 50  # 每个服务最大连接数
    connection-timeout: 2000    # 连接超时（ms）
    connection-timer-repeat: 3000  # 连接池维护间隔（ms）
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| TCP 连接创建 | 每次请求新建 | 连接复用（keep-alive） |
| 单次调用延迟 | +1ms（握手） | 0ms（复用） |
| Socket 对象创建 | 每次请求 1 个 | 池化复用 |
| GC 压力 | 高频 Socket/Stream 对象 | 大幅减少 |

#### 成本

- 添加 1 个 Maven 依赖
- 添加 5 行 YAML 配置
- 需验证各服务 Feign 调用正常

#### 风险

连接池大小需根据实际并发量调整，过小会导致连接等待，过大可能占用过多文件描述符。建议初始值 `max-connections=200`，根据监控调整。

---

### B3: MyBatis SQL 全量 stdout 输出

| 维度 | 内容 |
|------|------|
| **文件** | `shop-payment-server/src/main/resources/application.yml`（L22-23）<br>`shop-user-server/src/main/resources/application.yml`（L15-16） |
| **严重程度** | 高 |
| **影响路径** | 每次数据库操作 |

#### 问题分析

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

`StdOutImpl` 通过 `System.out.println` 直接输出每条 SQL 语句、参数和结果集到控制台。`System.out` 是同步阻塞 I/O，且不受日志级别控制。

每次 SQL 执行产生：
1. SQL 语句字符串拼接（含参数占位符替换）
2. `System.out.println` 同步写入（持有锁）
3. 结果集行数据序列化为字符串

在高频查询场景下（如商品列表、订单列表），每秒数十条 SQL 的日志输出会：
- 产生大量临时字符串对象（短生命周期，增加 Minor GC 频率）
- `System.out` 同步锁阻塞业务线程
- 控制台 I/O 成为性能瓶颈

#### 修改逻辑

**方案 A（推荐）**：改用 Slf4j 实现，受日志级别控制

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.slf4j.Slf4jImpl
```

生产环境 `logging.level.com.gec.shop=INFO`，SQL 日志仅在 `DEBUG` 级别输出。

**方案 B**：直接移除 `log-impl` 配置，MyBatis-Plus 默认不输出 SQL 日志。

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| SQL 日志输出 | 每条 SQL 强制输出 | 仅 DEBUG 级别输出 |
| 字符串创建 | 每条 SQL ~200-500 字符 | 生产环境 0 |
| I/O 阻塞 | System.out 同步锁 | 无 |
| 日志控制 | 不可关闭 | 可通过日志级别控制 |

#### 成本

2 个文件各改 1 行，无功能影响。

---

### F1: URL.createObjectURL 内存泄漏

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/hooks/use-recognition.ts` |
| **行号** | 36, 80-87 |
| **严重程度** | 高 |
| **影响路径** | 用户每次上传图片识别 |

#### 问题分析

```typescript
// L36: 创建 Blob URL 但永不释放
setSelectedImage(URL.createObjectURL(file))

// L80-87: 清除时仅置 null，未调用 revokeObjectURL
const clearImage = () => {
    setSelectedImage(null)
    // ...
}
```

`URL.createObjectURL(file)` 在浏览器内存中创建一个指向 `File` 对象的 Blob URL。该 URL 会一直保持对 `File` 对象的强引用，直到：
1. 显式调用 `URL.revokeObjectURL(url)` 释放
2. 页面卸载（SPA 中不会自动卸载）

用户每次上传新图片或点击清除时，旧的 Blob URL 未被释放，对应的 `File` 对象（可能几 MB）无法被垃圾回收。连续上传 10 张 2MB 的图片将泄漏 ~20MB 内存。

#### 修改逻辑

```typescript
// 1. processImage 中：创建新 URL 前先释放旧的
const processImage = async (file: File) => {
    // 释放上一个 Blob URL
    if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(URL.createObjectURL(file));
    // ...
}

// 2. clearImage 中：释放当前 URL
const clearImage = () => {
    if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    // ...
}

// 3. 组件卸载时释放（在 useEffect cleanup 中）
useEffect(() => {
    return () => {
        if (selectedImage) {
            URL.revokeObjectURL(selectedImage);
        }
    };
}, [selectedImage]);
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 每次上传泄漏内存 | ~2-5MB（图片大小） | 0 |
| 连续上传 10 次泄漏 | ~20-50MB | 0 |
| Blob URL 数量 | 持续增长 | 始终 ≤1 |

#### 成本

~10 行代码改动，无功能影响。

---

### B4: OrderServiceImpl.findByUid N+1 Feign 调用

| 维度 | 内容 |
|------|------|
| **文件** | `shop-order-server/src/main/java/com/gec/shop/order/service/impl/OrderServiceImpl.java` |
| **行号** | 199-206 |
| **严重程度** | 高 |
| **影响路径** | 订单列表查询（用户查看自己的订单） |

#### 问题分析

```java
public List<Order> findByUid(Long uid) {
    List<Order> orders = super.lambdaQuery()
            .eq(Order::getUid, uid)
            .orderByDesc(Order::getId)
            .list();
    orders.forEach(this::refreshProductName);  // N 次 Feign 调用
    return orders;
}

private void refreshProductName(Order order) {
    try {
        Product product = productFeignService.get(order.getPid());  // 1 次 HTTP 调用
        // ...
    }
}
```

若用户有 N 笔订单，则触发 N 次独立的 Feign→product 服务调用。每次调用：
1. 创建 HTTP 请求/响应对象
2. TCP 连接创建（当前无连接池，见 B2）
3. product 服务查询数据库
4. JSON 序列化/反序列化

10 笔订单 = 10 次 HTTP 调用，延迟叠加 ~100-200ms。

#### 修改逻辑

**方案**：在 product 服务新增批量查询接口，一次性获取所有商品名称。

**步骤 1**：`shop-product-api` 模块的 `IProductFeignService` 添加批量接口：

```java
@GetMapping("/product/batch")
Map<Long, String> batchGetProductNames(@RequestParam("ids") List<Long> ids);
```

**步骤 2**：`shop-product-server` 的 `ProductController` + `ProductService` 实现批量查询：

```java
// ProductController
@GetMapping("/batch")
public Map<Long, String> batchGetProductNames(@RequestParam List<Long> ids) {
    return productService.batchGetNames(ids);
}

// ProductService
public Map<Long, String> batchGetNames(List<Long> ids) {
    return lambdaQuery()
            .select(Product::getId, Product::getName)
            .in(Product::getId, ids)
            .list()
            .stream()
            .collect(Collectors.toMap(Product::getId, Product::getName));
}
```

**步骤 3**：修改 `OrderServiceImpl.findByUid`：

```java
public List<Order> findByUid(Long uid) {
    List<Order> orders = super.lambdaQuery()
            .eq(Order::getUid, uid)
            .orderByDesc(Order::getId)
            .list();

    if (!orders.isEmpty()) {
        // 批量查询商品名称，1 次 Feign 调用替代 N 次
        List<Long> pids = orders.stream()
                .map(Order::getPid)
                .distinct()
                .collect(Collectors.toList());
        try {
            Map<Long, String> nameMap = productFeignService.batchGetProductNames(pids);
            orders.forEach(order -> {
                String name = nameMap.get(order.getPid());
                if (name != null) {
                    order.setProductName(name);
                }
            });
        } catch (Exception e) {
            log.warn("批量刷新商品名称失败, uid={}, orderCount={}", uid, orders.size(), e);
        }
    }
    return orders;
}
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| Feign 调用次数 | N 次（N = 订单数） | 1 次 |
| HTTP 请求对象创建 | N 个 | 1 个 |
| 网络延迟 | N × RTT | 1 × RTT |
| 10 笔订单延迟 | ~100-200ms | ~10-20ms |

#### 成本

- 新增 1 个 Feign 接口方法
- 新增 1 个 Controller 方法 + 1 个 Service 方法
- 修改 `findByUid` 实现
- 需添加 `Collectors` 导入

#### 风险

批量查询的 `IN` 子句参数过多可能触发 SQL 长度限制（MySQL 默认 `max_allowed_packet=4MB`），但商品 ID 列表通常不会超过几百个，风险极低。

---

## 二、中优先级修复方案

### B5: HikariCP 数据库连接池未配置

| 维度 | 内容 |
|------|------|
| **文件** | 各服务 `application.yml` |
| **严重程度** | 中 |

#### 问题分析

所有服务均未配置 `spring.datasource.hikari` 参数，使用 HikariCP 默认值：
- `maximumPoolSize = 10`
- `minimumIdle = same as maximumPoolSize`
- `connectionTimeout = 30000ms`

order 服务配置了 `server.tomcat.threads.max: 10`，与连接池 1:1 匹配。但其他服务未限制 Tomcat 线程数（默认 200），10 个数据库连接在 200 并发时成为瓶颈。

#### 修改逻辑

在 `application.yml` 中添加：

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20      # 根据服务负载调整
      minimum-idle: 5            # 保持 5 个空闲连接
      connection-timeout: 3000   # 3 秒超时（默认 30 秒过长）
      idle-timeout: 600000       # 10 分钟空闲超时
      max-lifetime: 1800000      # 30 分钟最大生命周期
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 最大连接数 | 10（固定） | 20（可调整） |
| 连接获取超时 | 30s（过长，线程长时间阻塞） | 3s（快速失败） |
| 空闲连接管理 | 无（minimumIdle=10） | 动态（5-20） |

#### 成本

每个服务 `application.yml` 添加 5 行配置。

---

### B6: Redis Lettuce 连接池未配置

| 维度 | 内容 |
|------|------|
| **文件** | `shop-order-server/application.yml`（L7-10）<br>`shop-payment-server/application.yml`（L4-7） |
| **严重程度** | 中 |

#### 问题分析

order 和 payment 服务使用 Redis 分布式锁，但未配置 Lettuce 连接池参数。Lettuce 默认使用单个连接（非池化），在高并发锁操作时可能成为瓶颈。

#### 修改逻辑

```yaml
spring:
  redis:
    lettuce:
      pool:
        max-active: 16       # 最大连接数
        max-idle: 8          # 最大空闲连接
        min-idle: 2          # 最小空闲连接
        max-wait: 3000ms     # 获取连接超时
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| Redis 连接数 | 1（Lettuce 默认单连接） | 最多 16 |
| 并发锁操作 | 串行等待 | 并行执行 |

#### 成本

2 个文件各添加 5 行配置。需添加 `commons-pool2` 依赖（Lettuce 池化需要）：

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-pool2</artifactId>
</dependency>
```

---

### B7: VersionPriorityRule 每次请求创建中间集合

| 维度 | 内容 |
|------|------|
| **文件** | `shop-order-server/src/main/java/com/gec/shop/order/ribbon/VersionPriorityRule.java` |
| **行号** | 40-43 |
| **严重程度** | 中 |

#### 问题分析

```java
List<Server> priorityServers = reachableServers.stream()
        .filter(server -> server instanceof NacosServer)
        .filter(server -> PRIORITY_VERSION.equals(((NacosServer) server).getMetadata().get(VERSION_KEY)))
        .collect(Collectors.toList());
```

每次 Feign 调用（order→product）都触发负载均衡，创建新的 `ArrayList`。在高并发下产生大量短生命周期集合对象。

#### 修改逻辑

改用传统 for 循环 + 预分配容量，避免 Stream 中间对象：

```java
List<Server> priorityServers = new ArrayList<>(reachableServers.size());
for (Server server : reachableServers) {
    if (server instanceof NacosServer) {
        NacosServer nacosServer = (NacosServer) server;
        if (PRIORITY_VERSION.equals(nacosServer.getMetadata().get(VERSION_KEY))) {
            priorityServers.add(nacosServer);
        }
    }
}
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 中间对象 | Stream pipeline + ArrayList | 1 个 ArrayList（预分配） |
| 装箱开销 | Stream filter 装箱 | 无 |

#### 成本

~8 行代码替换，逻辑等价。

---

### B8: VersionPriorityRule 每次请求 INFO 输出完整 metadata

| 维度 | 内容 |
|------|------|
| **文件** | `shop-order-server/src/main/java/com/gec/shop/order/ribbon/VersionPriorityRule.java` |
| **行号** | 52-53 |
| **严重程度** | 低 |

#### 修改逻辑

```java
// 优化前
log.info("Ribbon 选择实例: {}:{}, metadata: {}",
        nacosServer.getHost(), nacosServer.getPort(), nacosServer.getMetadata());

// 优化后：降为 DEBUG，移除 metadata 完整输出
log.debug("Ribbon 选择实例: {}:{}", nacosServer.getHost(), nacosServer.getPort());
```

#### 预期收益

生产环境（INFO 级别）不再输出此日志，消除每次请求的字符串拼接。

---

### F2: snack-mascot.tsx setTimeout 未清除

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/components/fun/snack-mascot.tsx` |
| **行号** | 101 |
| **严重程度** | 中 |

#### 问题分析

```typescript
const handleClick = useCallback(() => {
    // ...
    setTimeout(() => setMood("idle"), 1200);  // 未保存返回值
}, [mood, scheduleSleep]);
```

该组件在 `layout.tsx` 全局渲染，所有页面都存在。用户点击后 1200ms 内路由切换，`setMood` 会操作已卸载组件。

#### 修改逻辑

使用 ref 跟踪定时器，在组件卸载时清除：

```typescript
const moodTimerRef = useRef<ReturnType<typeof setTimeout>>();

const handleClick = useCallback(() => {
    // ...
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => setMood("idle"), 1200);
}, [mood, scheduleSleep]);

useEffect(() => {
    return () => {
        if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
}, []);
```

#### 预期收益

消除组件卸载后的状态更新警告和潜在内存泄漏。

---

### F3: auth-fuse.tsx setTimeout 未清除

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/components/ui/auth-fuse.tsx` |
| **行号** | 229 |
| **严重程度** | 中 |

#### 修改逻辑

与 F2 相同模式，使用 ref 跟踪定时器并在卸载时清除：

```typescript
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

// L229
if (result === true) {
    setSuccessMsg("密码重置成功，请使用新密码登录");
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => switchMode("login"), 1500);
}

// useEffect cleanup
useEffect(() => {
    return () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
}, []);
```

---

### F4: typewriter.tsx 嵌套 setTimeout 未清除

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/components/design/typewriter.tsx` |
| **行号** | 40 |
| **严重程度** | 中 |

#### 问题分析

```typescript
useEffect(() => {
    const timeout = setTimeout(() => {
        // ...
        if (loop) {
            setTimeout(() => setIsDeleting(true), delay);  // 嵌套，未被清除
        }
    }, isDeleting ? deleteSpeed : speed);
    return () => clearTimeout(timeout);  // 仅清除外层
}, [/* deps */]);
```

#### 修改逻辑

将嵌套 setTimeout 改为独立的 useEffect 触发，或使用 ref 跟踪：

```typescript
const nestedTimerRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
    const timeout = setTimeout(() => {
        // ...
        if (loop && currentIndex === currentText.length) {
            nestedTimerRef.current = setTimeout(() => setIsDeleting(true), delay);
        }
    }, isDeleting ? deleteSpeed : speed);

    return () => {
        clearTimeout(timeout);
        if (nestedTimerRef.current) clearTimeout(nestedTimerRef.current);
    };
}, [/* deps */]);
```

---

### F5: floating-snacks.tsx THREE.js 材质未 dispose

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/components/three/floating-snacks.tsx` |
| **行号** | 36-54 |
| **严重程度** | 中 |

#### 修改逻辑

在组件卸载时释放材质资源：

```typescript
const material = useMemo(() =>
    new THREE.MeshStandardMaterial({ color: "#d4a373", roughness: 0.4, metalness: 0.1 }),
    []
);

useEffect(() => {
    return () => {
        material.dispose();
    };
}, [material]);
```

#### 预期收益

释放 GPU 显存，避免首页多次进出后显存持续增长。

---

### F6: floating-snacks.tsx import * as THREE

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/components/three/floating-snacks.tsx` |
| **行号** | 6 |
| **严重程度** | 中 |

#### 修改逻辑

```typescript
// 优化前
import * as THREE from "three";

// 优化后：按需导入
import { MeshStandardMaterial, Group, Mesh, TorusGeometry, SphereGeometry } from "three";
```

#### 预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 打包体积 | ~600KB（全量） | ~100-200KB（tree-shaking 后） |
| 首页加载 | 加载完整 THREE.js | 仅加载使用部分 |

---

### B9: SmsCodeServiceImpl System.out.println

| 维度 | 内容 |
|------|------|
| **文件** | `shop-user-server/src/main/java/com/gec/shop/user/service/impl/SmsCodeServiceImpl.java` |
| **行号** | 86 |
| **严重程度** | 低 |

#### 修改逻辑

```java
// 优化前
System.out.println("【验证码】" + phone + ": " + code);

// 优化后
log.info("验证码发送: phone={}, code={}", phone, code);
```

#### 预期收益

- 消除 `System.out` 同步锁阻塞
- 受日志级别控制（生产可设为 DEBUG 不输出）
- 结构化日志便于过滤

---

### F7: limelight-nav.tsx setTimeout 未清除

| 维度 | 内容 |
|------|------|
| **文件** | `shop-web-next/src/components/ui/limelight-nav.tsx` |
| **行号** | 43 |
| **严重程度** | 低 |

#### 修改逻辑

```typescript
const readyTimerRef = useRef<ReturnType<typeof setTimeout>>();

useLayoutEffect(() => {
    if (!isReady) {
        readyTimerRef.current = setTimeout(() => setIsReady(true), 50);
    }
    return () => {
        if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    };
}, [safeActiveIndex, isReady, items]);
```

---

## 三、低优先级修复方案

### F8: limelight-nav.tsx document.fonts.ready Promise 无法取消

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `limelight-nav.tsx` | 49-61 | 添加 `isMounted` ref，Promise 回调中检查 `if (!isMounted.current) return;` |

### F9: auth-fuse.tsx 静态数组每次渲染重建

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `auth-fuse.tsx` | 242-253 | 将 `tabs` 和 `features` 数组移到组件外部定义为模块级常量 |

### F10: app/page.tsx 静态数组每次渲染重建

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `app/page.tsx` | 18-43 | 将 `features` 和 `stats` 数组移到组件外部 |

### F11: products/page.tsx 派生计算未 memo

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `products/page.tsx` | 26, 48-50 | `const categoryTags = useMemo(() => ..., [products])`<br>`const filteredProducts = useMemo(() => ..., [products, selectedCategory])` |

### F12: orders/page.tsx filteredOrders 未 memo

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `orders/page.tsx` | 67-69 | `const filteredOrders = useMemo(() => ..., [orders, activeFilter])` |

### F13: login/page.tsx handler 未 useCallback

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `login/page.tsx` | 12-57 | 4 个 handler 函数用 `useCallback` 包裹 |

### F14: image-uploader.tsx img 缺少 width/height

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `image-uploader.tsx` | 57-65 | 添加 `width={480} height={480}` 属性（与 `max-h-[480px]` 匹配） |

### F15: layout.tsx 全局动画组件持续运行

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `layout.tsx` | 43 | 可选：用 `usePathname()` 判断非首页时不渲染 `SnackMascot`，或添加 `prefers-reduced-motion` 检测后禁用动画 |

### F16: auth-fuse.tsx import * as React 冗余

| 文件 | 行号 | 修改逻辑 |
|------|------|---------|
| `auth-fuse.tsx` | 3 | 移除 `import * as React`，将 `React.FormEvent` 改为 `import { type FormEvent }` |

---

## 四、修复执行顺序与依赖关系

```
阶段 1（无依赖，可并行）：
├── B1: RedisLockUtil 提取常量          ← 1 行改动
├── B3: 移除 StdOutImpl                ← 2 行改动
├── B8: 日志降级                       ← 1 行改动
├── B9: System.out → log              ← 1 行改动
├── F1: revokeObjectURL               ← 10 行改动
├── F2-F4: setTimeout 清除             ← ~20 行改动
├── F9-F10: 静态数组外移               ← 移动代码
└── F16: 移除冗余 import               ← 1 行改动

阶段 2（配置变更，需验证）：
├── B2: Feign 连接池                   ← 依赖 + 配置
├── B5: HikariCP 配置                  ← 配置
└── B6: Redis 连接池                   ← 依赖 + 配置

阶段 3（接口变更，需测试）：
└── B4: 批量查询接口                   ← 新增 Feign 接口 + 修改 findByUid

阶段 4（优化项，可延后）：
├── B7: VersionPriorityRule for 循环
├── F5-F6: THREE.js 优化
├── F7-F8: limelight-nav 修复
├── F11-F13: useMemo/useCallback
├── F14: img width/height
└── F15: 全局动画优化
```

---

## 五、风险评估

| 修复项 | 风险等级 | 风险描述 | 缓解措施 |
|--------|---------|---------|---------|
| B1 | 无 | 提取常量，逻辑等价 | — |
| B2 | 低 | 连接池参数不当可能导致连接等待 | 初始值保守（200），监控调整 |
| B3 | 无 | 日志级别可控 | — |
| B4 | 低 | 批量查询 IN 子句过长 | 商品 ID 数量有限，风险极低 |
| B5 | 低 | 连接池大小需匹配 Tomcat 线程数 | 按服务分别配置 |
| B6 | 低 | 需添加 commons-pool2 依赖 | Spring Boot 管理版本 |
| B7 | 无 | for 循环与 Stream 逻辑等价 | — |
| F1 | 无 | 仅添加 revoke 调用 | — |
| F2-F4 | 无 | 仅添加 cleanup 逻辑 | — |
| F5 | 低 | dispose 时机需在组件卸载后 | useEffect cleanup 保证 |
| F6 | 低 | 按需导入需确认所有使用到的类 | tsc 编译验证 |

---

## 六、预期总体收益

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| **后端 GC 压力** | 高频路径（解锁/SQL日志/Feign连接）持续产生短生命周期对象 | 消除 3 个高频对象创建源 |
| **后端网络延迟** | Feign 每次新建 TCP + N+1 调用 | 连接复用 + 批量查询，延迟降低 80%+ |
| **前端内存** | 图片上传泄漏 + 定时器泄漏 + THREE.js 显存泄漏 | 消除全部泄漏点 |
| **前端打包体积** | THREE.js 全量导入 | 减少 ~400KB |
| **日志 I/O** | SQL 全量 stdout + 同步锁 | Slf4j 异步 + 级别控制 |
