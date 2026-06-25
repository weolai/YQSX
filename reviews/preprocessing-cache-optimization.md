# 预处理与缓存优化方案

**日期**：2026-06-24
**目标**：通过预处理、缓存预热、构建优化降低运行时内存占用和能耗，优化启动速度

---

## 1. 当前状态

| 维度 | 现状 | 问题 |
|------|------|------|
| JVM 参数 | 仅 `-Xmx`，无 `-Xms`/GC 参数 | 堆动态扩展有开销，GC 策略未优化 |
| Spring 启动 | 全部 Bean 饿加载 | Feign/Sentinel 等非核心 Bean 拖慢启动 |
| Redis | 仅用于分布式锁 | 商品/分类等热点数据未缓存 |
| MyBatis | 二级缓存未开启 | 重复查询走数据库 |
| 前端构建 | `npm run dev`（开发模式） | 无代码压缩/Tree-shaking/SSG |
| 前端请求 | 裸 axios，无 SWR | 无客户端缓存、无去重 |
| 静态资源 | 无 `Cache-Control` 头 | 每次访问重新下载 |

---

## 2. 优化方案（按 ROI 排序）

### 第一梯队：启动速度 + JVM 内存（高收益、低成本）

#### 优化 1：JVM `-Xms` = `-Xmx` + G1GC

**问题**：`start_project.py` 第 323 行仅传 `-Xmx`，未设 `-Xms`，堆从 0 扩展到目标值有性能开销；未指定 GC 策略。

**修改文件**：`start_project.py`

**修改逻辑**：

```python
# calculate_jvm_heap_sizes 函数返回值改为包含完整 JVM 参数
def build_jvm_args(xmx: str) -> list:
    """构建 JVM 启动参数"""
    xms = xmx.replace("-Xmx", "-Xms")
    return [
        xms,                           # 初始堆 = 最大堆，避免动态扩展
        xmx,
        "-XX:+UseG1GC",                # G1 垃圾回收器，适合微服务小堆
        "-XX:MaxGCPauseMillis=200",    # GC 停顿目标 200ms
        "-XX:+HeapDumpOnOutOfMemoryError",  # OOM 时自动转储
        "-XX:HeapDumpPath=logs/",      # 转储路径
    ]
```

```python
# start_java_service 函数第 323 行
# 修改前：
start_process(["java", xmx, "-jar", str(jar)], name=f"Java:{name}")

# 修改后：
jvm_args = build_jvm_args(xmx)
start_process(["java"] + jvm_args + ["-jar", str(jar)], name=f"Java:{name}")
```

**预期收益**：
- 启动时堆一次性分配，消除动态扩展开销（~200-500ms）
- G1GC 降低 GC 停顿（ParallelGC 的 STW 可达 100ms+，G1 目标 <200ms）
- OOM 时有堆转储便于排查

**风险**：`-Xms`=`-Xmx` 会立即占用全部堆内存，8GB 系统需确认内存够用

---

#### 优化 2：Spring 懒加载

**问题**：所有 Bean 启动时饿加载，包括 Feign 客户端、Sentinel 规则加载等非核心组件。

**修改文件**：各服务 `application.yml`（gateway/user/product/order/payment）

**修改逻辑**：

```yaml
spring:
  main:
    lazy-initialization: true   # 非核心 Bean 延迟到首次使用时初始化
```

**预期收益**：
- 启动时间减少 30-50%（Feign 客户端、数据库连接等延迟创建）
- 启动时内存占用降低（未使用的 Bean 不创建实例）

**风险**：
- 首次请求可能稍慢（Bean 初始化延迟到首次调用）
- Sentinel 规则需确认是否通过 `CommandLineRunner` 加载（已确认是，不受影响）
- 需测试验证所有功能正常

---

#### 优化 3：前端生产构建

**问题**：`start_project.py` 使用 `npm run dev`（开发模式），无代码压缩、无 Tree-shaking、无静态优化。

**修改文件**：`start_project.py`

**修改逻辑**：

```python
# 修改前（第 ~400 行附近）：
start_process(["cmd", "/c", "npm", "run", "dev"], cwd=frontend_dir, name="Frontend")

# 修改后：先构建再启动
# 方案 A：每次启动都构建（安全但慢）
subprocess.run(["cmd", "/c", "npm", "run", "build"], cwd=frontend_dir, check=True)
start_process(["cmd", "/c", "npm", "run", "start"], cwd=frontend_dir, name="Frontend")

# 方案 B（推荐）：检测 .next 目录是否存在，存在则跳过构建
next_build_dir = frontend_dir / ".next"
if next_build_dir.exists():
    log("检测到已有构建产物，跳过 build 步骤")
    start_process(["cmd", "/c", "npm", "run", "start"], cwd=frontend_dir, name="Frontend")
else:
    log("首次启动，执行 build...")
    subprocess.run(["cmd", "/c", "npm", "run", "build"], cwd=frontend_dir, check=True)
    start_process(["cmd", "/c", "npm", "run", "start"], cwd=frontend_dir, name="Frontend")
```

**预期收益**：
- JS 包体积减少 40-60%（压缩 + Tree-shaking）
- 首屏加载速度提升 50%+
- 运行时内存降低（无需开发模式的热更新模块）

**风险**：
- 代码修改后需重新 `npm run build`（开发时仍可用 `npm run dev`）
- 生产模式无 Fast Refresh，调试体验不同

---

### 第二梯队：运行时缓存（中收益、中成本）

#### 优化 4：Redis 缓存热点数据

**问题**：商品列表、商品详情等只读数据每次请求查数据库，Redis 仅用于分布式锁。

**修改文件**：
1. `shop-product-server` 启动类添加 `@EnableCaching`
2. `ProductServiceImpl` 添加 `@Cacheable` 注解
3. 新增 `CachePreloadRunner` 启动时预热

**修改逻辑**：

```java
// ProductServer.java
@SpringBootApplication
@EnableDiscoveryClient
@MapperScan("com.gec.shop.product.mapper")
@EnableFeignClients
@EnableCaching                          // 新增
public class ProductServer { ... }
```

```java
// ProductServiceImpl.java
@Cacheable(value = "product:list", key = "#categoryId", unless = "#result == null || #result.isEmpty()")
@Override
public List<Product> listProducts(Long categoryId) { ... }

@Cacheable(value = "product:detail", key = "#id", unless = "#result == null")
@Override
public Product getById(Long id) { ... }

@CacheEvict(value = {"product:list", "product:detail"}, allEntries = true)
@Override
public boolean updateById(Product entity) { ... }
```

```java
// 新增 CachePreloadRunner.java
@Component
@RequiredArgsConstructor
@Slf4j
public class CachePreloadRunner implements CommandLineRunner {
    private final ProductService productService;

    @Override
    public void run(String... args) {
        log.info("开始预热商品缓存...");
        // 预加载全量商品列表
        productService.listProducts(null);
        // 预加载热门商品详情（前 20 个）
        productService.list().stream()
            .limit(20)
            .forEach(p -> productService.getById(p.getId()));
        log.info("商品缓存预热完成");
    }
}
```

```yaml
# application.yml 添加缓存 TTL
spring:
  cache:
    type: redis
    redis:
      time-to-live: 600000      # 10 分钟
      cache-null-values: false   # 不缓存 null
```

**预期收益**：
- 商品查询从 DB（~5-20ms）→ Redis（~0.5-2ms），QPS 提升 5-10 倍
- DB 连接池压力降低，可适当减小 `maximum-pool-size`
- 启动时预热避免冷启动

**风险**：
- 库存扣减/回滚需配合 `@CacheEvict` 保证一致性
- 缓存穿透/雪崩需配置 `cache-null-values: false` + TTL

---

#### 优化 5：MyBatis 二级缓存

**问题**：MyBatis 二级缓存未开启，同一 Mapper 的重复查询走数据库。

**修改文件**：`application.yml` + `ProductMapper.java`

**修改逻辑**：

```yaml
# application.yml
mybatis-plus:
  configuration:
    cache-enabled: true    # 开启二级缓存
```

```java
// ProductMapper.java
@CacheNamespace   // 开启该 Mapper 的二级缓存
public interface ProductMapper extends BaseMapper<Product> { ... }
```

**预期收益**：
- 同一 SqlSession 范围内的重复查询走缓存
- 与 Redis 缓存形成两级缓存，进一步降低 DB 压力

**风险**：
- 缓存一致性：更新操作需配置 `@CacheEvict` 或使用 `flushCache`
- 只适合读多写少的表（商品表适合，订单表不适合）

---

#### 优化 6：前端 SWR 请求缓存

**问题**：前端使用裸 axios，无客户端缓存、无请求去重、无后台重验证。

**修改文件**：`package.json` + `src/lib/api/` 下新增 SWR hooks

**修改逻辑**：

```bash
npm install swr
```

```typescript
// src/lib/api/hooks/use-products.ts
import useSWR from 'swr'
import request from '../request'

// 商品列表 Hook（带缓存 + 自动重验证）
export function useProducts(categoryId?: number) {
  const params = categoryId ? `?categoryId=${categoryId}` : ''
  return useSWR(`/products${params}`, (url) => request.get(url), {
    revalidateOnFocus: false,     // 切回标签页不重新请求
    dedupingInterval: 10000,      // 10 秒内相同请求去重
    refreshInterval: 0,           // 不自动刷新
  })
}

// 商品详情 Hook
export function useProduct(id: number) {
  return useSWR(`/products/${id}`, (url) => request.get(url), {
    revalidateOnFocus: false,
    dedupingInterval: 30000,      // 30 秒去重
  })
}
```

**预期收益**：
- 页面切换返回时立即显示缓存数据（无需 loading）
- 相同请求 10 秒内自动去重，减少 50%+ 网络请求
- 后台静默重验证，用户无感知

**风险**：
- 需改造现有页面组件的数据获取逻辑
- 登录态相关请求不适合缓存

---

#### 优化 7：静态资源缓存头

**问题**：`next.config.ts` 未配置 `Cache-Control`，静态资源每次访问重新下载。

**修改文件**：`next.config.ts`

**修改逻辑**：

```typescript
const nextConfig: NextConfig = {
  images: { /* 保持不变 */ },
  async rewrites() { /* 保持不变 */ },
  
  // 新增：静态资源缓存头
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',  // 1 年，不可变
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',  // 1 天
          },
        ],
      },
    ]
  },
}
```

**预期收益**：
- `_next/static/*`（JS/CSS/字体）浏览器缓存 1 年，二次访问零传输
- 带哈希文件名的资源 `immutable` 标记，浏览器跳过条件请求

**风险**：无（Next.js 构建产物文件名含哈希，内容变更时自动更新）

---

### 第三梯队：预处理/预生成（高收益、高成本）

#### 优化 8：前端 ISR 静态再生

**问题**：所有页面均为 CSR（`'use client'`），首屏需等待 JS 加载 + API 请求完成。

**修改文件**：`src/app/products/page.tsx` 等

**修改逻辑**：

```typescript
// src/app/products/page.tsx
// 改为 Server Component + ISR

// 静态生成商品列表页，每 60 秒后台再生
export const revalidate = 60

async function getProducts() {
  const res = await fetch('http://localhost:8080/api/products', {
    next: { revalidate: 60 },
  })
  return res.json()
}

export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductList products={products} />  // ProductList 为 client component
}
```

**预期收益**：
- 首屏从 SSG 缓存直接返回 HTML（<100ms），无需等待 CSR
- 60 秒后台自动再生，数据不会过期太久
- CDN 可直接缓存 HTML

**风险**：
- 需重构页面组件，分离 Server/Client 逻辑
- 动态内容（用户订单）不适合 ISR
- 改动量大，建议仅对商品列表/详情页实施

---

#### 优化 9：数据库连接预热

**问题**：HikariCP `minimum-idle: 5` 预建连接，但未验证连接活性，首次查询可能超时。

**修改文件**：新增 `DbWarmupRunner.java`

**修改逻辑**：

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class DbWarmupRunner implements CommandLineRunner {
    private final DataSource dataSource;

    @Override
    public void run(String... args) {
        log.info("预热数据库连接...");
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement("SELECT 1")) {
                ps.executeQuery();
            }
            log.info("数据库连接预热完成");
        } catch (Exception e) {
            log.warn("数据库连接预热失败: {}", e.getMessage());
        }
    }
}
```

**预期收益**：
- 首次请求无连接超时风险
- 验证连接池配置正确

**风险**：无

---

#### 优化 10：清理无用静态资源

**问题**：`public/` 目录含 5 个 Next.js 模板 SVG，未被业务使用。

**修改文件**：删除 `public/` 下 `next.svg`、`vercel.svg`、`window.svg`、`globe.svg`、`file.svg`

**预期收益**：构建产物体积减少（微小）

**风险**：需确认无页面引用这些文件

---

## 3. 执行计划

### 阶段 1：启动优化（第 1 梯队，无依赖）

| 优化项 | 修改文件 | 预计改动 |
|--------|---------|---------|
| 优化 1：JVM 参数 | `start_project.py` | ~15 行 |
| 优化 2：Spring 懒加载 | 5 个 `application.yml` | 5 行 |
| 优化 3：前端生产构建 | `start_project.py` | ~10 行 |

### 阶段 2：缓存优化（第 2 梯队）

| 优化项 | 修改文件 | 预计改动 |
|--------|---------|---------|
| 优化 4：Redis 缓存 | 启动类 + Service + 新增 Runner + yml | ~60 行 |
| 优化 5：MyBatis 二级缓存 | yml + Mapper | ~5 行 |
| 优化 6：SWR 请求缓存 | package.json + 新增 hooks | ~50 行 |
| 优化 7：静态资源缓存头 | next.config.ts | ~20 行 |

### 阶段 3：预处理（第 3 梯队，可延后）

| 优化项 | 修改文件 | 预计改动 |
|--------|---------|---------|
| 优化 8：ISR | 页面组件重构 | ~100 行/页面 |
| 优化 9：DB 预热 | 新增 Runner | ~20 行 |
| 优化 10：清理资源 | 删除 5 个文件 | - |

---

## 4. 风险分析

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `-Xms`=`-Xmx` 立即占满堆 | 8GB 系统内存不足 | 已有分档计算，8GB 档各服务仅 256-384m |
| 懒加载首次请求慢 | 用户体验 | 仅影响首次调用，后续正常 |
| Redis 缓存一致性 | 商品数据不一致 | `@CacheEvict` + TTL 双保险 |
| 生产构建无热更新 | 开发体验 | 开发时仍用 `npm run dev`，部署用 `build` |
| ISR 重构工作量大 | 开发成本 | 仅对商品列表/详情实施，其他页面保持 CSR |

---

## 5. 预期总体收益

| 指标 | 优化前 | 优化后（阶段 1+2） | 变化 |
|------|--------|-------------------|------|
| Java 服务启动时间 | ~30-40s | ~15-20s | **-40%** |
| 前端首屏加载 | ~2-3s | ~0.5-1s | **-60%** |
| 商品查询 RT | ~10-20ms | ~0.5-2ms | **-90%** |
| DB 连接数峰值 | ~20/服务 | ~5-10/服务 | **-50%** |
| 前端网络请求 | 每次全量 | 50%+ 走缓存 | **-50%** |
| JVM GC 停顿 | 100ms+ | <200ms | **可控** |

---

## 6. 验证方案

- **启动时间**：`start_project.py` 已有端口探测计时，对比优化前后
- **内存占用**：`start_project.py` 已有 `log_service_memory`，对比优化前后
- **缓存命中率**：Redis `INFO stats` 查看 `keyspace_hits/keyspace_misses`
- **前端性能**：Chrome DevTools Network 面板对比请求数和传输量
- **GC 表现**：`-XX:+PrintGCDetails` 观察 GC 频率和停顿
