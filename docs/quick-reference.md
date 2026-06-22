# YQSX 项目快速参考手册

> 最常用的命令、配置和接口速查表

---

## 🚀 一键启动命令

### 更新商品图片

```bash
# Windows 批处理（推荐）
cd d:/Programming/YQSX
execute_update_images.bat

# 手动执行 SQL
mysql -u root -p1234 shop-product < update_product_images.sql
```

### 启动后端服务

```bash
# 1. Nacos
cd d:/Programming/YQSX/XML/nacos/bin
startup.cmd -m standalone

# 2. Gateway (必须第一个启动)
cd d:/Programming/YQSX/Test/shop-parent/shop-gateway-server
mvn spring-boot:run

# 3. Product Service
cd d:/Programming/YQSX/Test/shop-parent/shop-product-server
mvn spring-boot:run

# 4. Order Service
cd d:/Programming/YQSX/Test/shop-parent/shop-order-server
mvn spring-boot:run

# 5. User Service
cd d:/Programming/YQSX/Test/shop-parent/shop-user-server
mvn spring-boot:run

# 6. Payment Service
cd d:/Programming/YQSX/Test/shop-parent/shop-payment-server
mvn spring-boot:run

# 7. Recognition Service (Python)
cd d:/Programming/YQSX/XML/yolo_recognition_model/recognition-service
python main.py
```

### 启动前端项目

```bash
cd d:/Programming/YQSX/shop-web
npm run dev
```

---

## 🔗 常用访问地址

| 服务 | 地址 | 说明 |
|-----|------|------|
| 前端应用 | http://localhost:5173 | Vue 3 前端 |
| Gateway | http://localhost:8080 | 统一网关 |
| Nacos | http://localhost:8848/nacos | 用户名/密码: nacos/nacos |
| Sentinel | http://localhost:8080/sentinel | 限流控制台 |
| Zipkin | http://localhost:9411 | 链路追踪 |
| Grafana | http://localhost:3000 | 监控面板 |
| Prometheus | http://localhost:9090 | 指标采集 |

---

## 📝 测试数据

### 登录账号

```
用户名: admin
密码: 123456
```

### 商品 ID

```
id=1   Ashi Mashi 经典零食
id=2   Chee 番茄味薯片
id=4   Cheetoz 辣椒味薯片
id=11  Cheetoz 车轮零食 (识别测试推荐)
```

### 测试图片路径

```
d:/Programming/YQSX/XML/yolo_recognition_model/test_images/
```

---

## 🔌 API 接口速查

### 认证相关

```bash
# 登录（注意：使用 Query 参数）
POST /api/user/login?username=admin&password=123456
Response: { code: 200, userId: 1, username: "admin", token: "xxx" }

# 获取当前用户
GET /api/user/current
Header: Authorization: Bearer {token}
```

### 商品相关

```bash
# 商品详情
GET /api/products/{pid}
Header: Authorization: Bearer {token}

# 商品推荐
GET /api/products/recommend?categoryId=11&limit=10
Header: Authorization: Bearer {token}

# AI 识别（核心接口）
POST /api/products/recognize
Header: Authorization: Bearer {token}
Content-Type: multipart/form-data
Body: { file: <图片文件>, uid: <用户ID> }
```

### 订单相关

```bash
# 创建订单
POST /api/orders/save
Header: Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded
Body: pid=11&uid=1

# 订单列表
GET /api/orders/list/{uid}
Header: Authorization: Bearer {token}

# 订单详情
GET /api/orders/{id}
Header: Authorization: Bearer {token}
```

### 支付相关

```bash
# 订单支付
POST /api/payment/pay
Header: Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded
Body: orderId=xxx
```

---

## 🗄️ 数据库速查

### 连接信息

```
Host: localhost
Port: 3306
用户名: root
密码: 1234
```

### 数据库列表

```sql
-- 商品数据库
USE shop-product;

-- 订单数据库
USE shop-order;

-- 用户数据库
USE shop-user;

-- 支付数据库
USE shop-payment;
```

### 常用查询

```sql
-- 查看所有商品
SELECT id, name, price, stock, category_id, image_url FROM t_product;

-- 查看商品分类
SELECT * FROM t_product_category ORDER BY sort_order;

-- 查看识别日志
SELECT * FROM t_recognition_log ORDER BY create_time DESC LIMIT 10;

-- 查看订单列表
SELECT * FROM t_order ORDER BY create_time DESC LIMIT 10;

-- 查看订单状态分布
SELECT status, COUNT(*) as count FROM t_order GROUP BY status;
```

---

## 🛠️ 前端开发速查

### 项目创建

```bash
# 创建项目
npm create vite@latest shop-web -- --template vue-ts
cd shop-web

# 安装依赖
npm install element-plus @element-plus/icons-vue pinia vue-router@4 axios @vueuse/core dayjs
npm install -D sass @types/node
```

### 核心文件位置

参考 `docs/frontend-quickstart.md`：

- main.ts (160-186 行)
- request.ts (188-249 行)
- user.ts Store (251-293 行)
- router/index.ts (347-423 行)
- product.ts API (309-345 行)

### 环境变量

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=智能零食商城

# .env.production
VITE_API_BASE_URL=https://api.example.com/api
VITE_APP_TITLE=智能零食商城
```

---

## 🐛 常见问题解决

### 1. MySQL 连接失败

```bash
# 检查 MySQL 服务
net start mysql

# 检查端口占用
netstat -ano | findstr "3306"

# 测试连接
mysql -u root -p1234 -e "SELECT 1"
```

### 2. Nacos 启动失败

```bash
# 单机模式启动
cd d:/Programming/YQSX/XML/nacos/bin
startup.cmd -m standalone

# 检查日志
tail -f ../logs/start.out
```

### 3. 前端跨域问题

已在 `vite.config.ts` 配置代理：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
```

### 4. 图片加载失败

```vue
<!-- 使用 Element Plus 错误兜底 -->
<el-image :src="product.imageUrl" fit="cover">
  <template #error>
    <div class="image-slot">
      <el-icon><Picture /></el-icon>
    </div>
  </template>
</el-image>
```

### 5. Token 过期

已在 `request.ts` 响应拦截器处理：

```typescript
if (status === 401) {
  ElMessage.error('登录已过期，请重新登录')
  userStore.logout()
  window.location.href = '/login'
}
```

---

## 📊 服务端口速查

| 服务 | 端口 | 状态检查 |
|-----|------|---------|
| Gateway | 8080 | http://localhost:8080/actuator/health |
| Product | 8081 | http://localhost:8081/actuator/health |
| Order | 8091 | http://localhost:8091/actuator/health |
| User | 8083 | http://localhost:8083/actuator/health |
| Payment | 8084 | http://localhost:8084/actuator/health |
| Recognition | 8086 | http://localhost:8086/health |
| Nacos | 8848 | http://localhost:8848/nacos |
| Redis | 6379 | redis-cli ping |
| MySQL | 3306 | mysql -u root -p1234 -e "SELECT 1" |
| Zipkin | 9411 | http://localhost:9411 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3000 | http://localhost:3000 |

---

## 🔍 日志查看

### 后端日志

```bash
# Gateway
tail -f Test/shop-parent/shop-gateway-server/logs/gateway.log

# Product Service
tail -f Test/shop-parent/shop-product-server/logs/product.log

# Order Service
tail -f Test/shop-parent/shop-order-server/logs/order.log
```

### Nacos 日志

```bash
tail -f XML/nacos/logs/nacos.log
```

### 前端控制台

浏览器 F12 → Console

---

## 📦 构建部署

### 前端构建

```bash
cd shop-web
npm run build

# 输出目录: dist/
```

### 后端打包

```bash
cd Test/shop-parent/shop-product-server
mvn clean package -DskipTests

# 输出: target/shop-product-server.jar
```

### Docker 部署（未来）

```bash
# 构建镜像
docker build -t yqsx-gateway:1.0 .

# 运行容器
docker run -d -p 8080:8080 yqsx-gateway:1.0
```

---

## 🎯 开发优先级

### Phase 1：核心页面（本周）

- [ ] 登录页 `/login`
- [ ] 商品详情页 `/products/:id`
- [ ] **AI 识别页 `/recognize`** ⭐ 最优先
- [ ] 首页 `/`

### Phase 2：订单功能（下周）

- [ ] 订单列表 `/orders`
- [ ] 订单详情 `/orders/:id`
- [ ] 订单支付流程

### Phase 3：完善功能

- [ ] 用户中心 `/user`
- [ ] 商品列表 `/products`
- [ ] 响应式适配

---

## 📚 文档索引

| 文档 | 说明 | 优先级 |
|-----|------|--------|
| [implementation-guide.md](./implementation-guide.md) | **实施指南** | ⭐⭐⭐⭐⭐ |
| [frontend-quickstart.md](./frontend-quickstart.md) | 快速启动 | ⭐⭐⭐⭐⭐ |
| [frontend-design-plan.md](./frontend-design-plan.md) | 设计方案 | ⭐⭐⭐⭐ |
| [product-images-solution.md](./product-images-solution.md) | 图片方案 | ⭐⭐⭐⭐ |
| [api-standard.md](./api-standard.md) | API 规范 | ⭐⭐⭐ |
| [project-status.md](./project-status.md) | 项目状态 | ⭐⭐⭐ |

---

## 💡 开发建议

### 1. 优先开发 AI 识别页

这是项目的核心亮点，建议优先实现并充分测试。

### 2. 使用 Element Plus 组件

不要重复造轮子：
- `el-upload` - 图片上传
- `el-card` - 商品卡片
- `el-table` - 订单列表
- `el-form` - 表单

### 3. 先占位图后真图

使用 Unsplash 快速启动，后续替换实际图片。

### 4. 充分测试识别流程

重点测试：
- 图片上传验证
- 识别进度显示
- 识别结果展示
- 推荐商品购买

### 5. 处理边界情况

- 图片加载失败
- 识别失败
- Token 过期
- 网络错误
- 空数据状态

---

## 🎨 UI 规范速查

### 颜色

```scss
$primary-color: #409EFF;   // 主色
$success-color: #67C23A;   // 成功
$warning-color: #E6A23C;   // 警告
$danger-color: #F56C6C;    // 危险
```

### 间距

```scss
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
```

### 字体

```scss
$font-size-small: 12px;
$font-size-base: 14px;
$font-size-large: 16px;
```

---

## ⚡ 快捷操作

### Git 操作

```bash
# 查看状态
git status

# 提交更改
git add .
git commit -m "feat: 完成 AI 识别页面"
git push

# 查看日志
git log --oneline -10
```

### Maven 操作

```bash
# 清理构建
mvn clean

# 编译
mvn compile

# 打包（跳过测试）
mvn package -DskipTests

# 运行
mvn spring-boot:run
```

### NPM 操作

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

---

**快速参考手册版本**: v1.0  
**创建时间**: 2026-06-22  
**适用项目**: YQSX 智能零食商城

---

**提示**: 将此文档加入浏览器书签，开发时随时查阅！📖
