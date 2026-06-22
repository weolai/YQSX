# 智能零食商城 - 前端界面设计方案

## 一、项目概述

基于 Vue 3 + TypeScript + Element Plus 的企业级商城前端，对接 Spring Cloud 微服务后端，核心特色是 **AI 图像识别购物**。

### 核心亮点

1. **AI 拍照识别**：用户上传零食图片，YOLO 模型识别后推荐同类商品
2. **智能推荐**：基于识别结果的商品推荐系统
3. **微服务架构**：通过 Gateway 统一网关访问后端服务
4. **现代化技术栈**：Vue 3 Composition API + TypeScript 严格模式

---

## 二、页面架构设计

### 2.1 整体布局

```
┌─────────────────────────────────────────────────┐
│                  顶部导航栏                       │
│  Logo | 首页 | 商品 | AI识别 | 订单 | 用户        │
└─────────────────────────────────────────────────┘
│                                                 │
│                                                 │
│                  主内容区                        │
│              <router-view />                    │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
│                  页脚信息                        │
│         版权 | 联系方式 | 备案号                 │
└─────────────────────────────────────────────────┘
```

### 2.2 页面路由结构

```typescript
routes = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '', name: 'Home', component: Home },
      { path: 'products', name: 'ProductList', component: ProductList },
      { path: 'products/:id', name: 'ProductDetail', component: ProductDetail },
      { path: 'recognize', name: 'Recognize', component: Recognize, meta: { requiresAuth: true } },
      { path: 'orders', name: 'OrderList', component: OrderList, meta: { requiresAuth: true } },
      { path: 'orders/:id', name: 'OrderDetail', component: OrderDetail, meta: { requiresAuth: true } },
      { path: 'user', name: 'UserCenter', component: UserCenter, meta: { requiresAuth: true } }
    ]
  },
  { path: '/login', name: 'Login', component: Login }
]
```

---

## 三、核心页面设计

### 3.1 登录页面 `/login`

**设计要点**：
- 简洁的登录表单（用户名 + 密码）
- JWT Token 认证
- 记住密码功能
- 响应式布局

**接口对接**：
```typescript
POST /api/user/login?username=admin&password=123456
Response: { code: 200, userId: 1, username: 'admin', token: 'xxx' }
```

**页面结构**：
```
┌─────────────────────────────────────┐
│        智能零食商城 Logo              │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ 用户名: [____________]       │  │
│   │ 密码:   [____________]       │  │
│   │ [ ] 记住密码                 │  │
│   │        [登录按钮]            │  │
│   └─────────────────────────────┘  │
│                                     │
│    还没有账号？立即注册               │
└─────────────────────────────────────┘
```

**关键功能**：
- 表单验证（用户名、密码不能为空）
- 登录成功后保存 Token 到 localStorage
- 登录成功跳转到首页

---

### 3.2 首页 `/`

**设计要点**：
- Banner 轮播图
- 商品分类导航
- 热门商品展示
- AI 识别入口（突出显示）

**页面结构**：
```
┌─────────────────────────────────────────────────┐
│              轮播 Banner                         │
│  [ AI 拍照识别 - 立即体验 ]                      │
└─────────────────────────────────────────────────┘
│                                                 │
│  商品分类                                        │
│  [薯片] [饼干] [零食] [威化] ...               │
│                                                 │
│  热门商品                                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │图片│ │图片│ │图片│ │图片│                  │
│  │名称│ │名称│ │名称│ │名称│                  │
│  │¥9.9│ │¥8.5│ │¥12 │ │¥7.5│                  │
│  └────┘ └────┘ └────┘ └────┘                  │
│                                                 │
│  推荐商品（更多商品展示...）                      │
└─────────────────────────────────────────────────┘
```

**关键功能**：
- 显示销量前 8 的热门商品
- 点击分类筛选商品
- 突出显示 AI 识别入口

---

### 3.3 商品列表页 `/products`

**设计要点**：
- 左侧分类筛选
- 右侧商品网格展示
- 分页加载
- 搜索功能

**页面结构**：
```
┌───────┬─────────────────────────────────────────┐
│       │  搜索: [___________] [搜索]             │
│ 全部  │                                         │
│ 薯片  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ 饼干  │  │图片│ │图片│ │图片│ │图片│           │
│ 零食  │  │名称│ │名称│ │名称│ │名称│           │
│ 威化  │  │¥9.9│ │¥8.5│ │¥12 │ │¥7.5│           │
│ ...   │  └────┘ └────┘ └────┘ └────┘           │
│       │                                         │
│       │  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│       │  │图片│ │图片│ │图片│ │图片│           │
│       │  │名称│ │名称│ │名称│ │名称│           │
│       │  │¥9.9│ │¥8.5│ │¥12 │ │¥7.5│           │
│       │  └────┘ └────┘ └────┘ └────┘           │
│       │                                         │
│       │  [分页: 1 2 3 4 ... 10]                │
└───────┴─────────────────────────────────────────┘
```

**接口对接**：
```typescript
GET /api/products/recommend?categoryId=1&limit=20
```

**关键功能**：
- 按分类筛选
- 搜索商品名称
- 分页加载
- 点击商品跳转详情页

---

### 3.4 商品详情页 `/products/:id`

**设计要点**：
- 商品大图展示
- 商品详细信息
- 库存、价格显示
- 立即购买按钮

**页面结构**：
```
┌────────────────┬──────────────────────────────┐
│                │  Cheetoz 辣椒味薯片             │
│                │  ¥ 10.00                      │
│   商品主图      │  库存: 600                     │
│   [400x400]    │  销量: 340                     │
│                │                               │
│                │  [ 立即购买 ]                  │
│                │                               │
└────────────────┴──────────────────────────────┘
│                                               │
│  商品详情                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│                                               │
│  品牌: Cheetoz                                │
│  口味: 辣椒味                                  │
│  规格: 90g                                     │
│  分类: 薯片                                    │
│                                               │
│  商品描述:                                     │
│  香辣可口，酥脆美味...                          │
│                                               │
│  相关推荐                                      │
│  ┌────┐ ┌────┐ ┌────┐                        │
│  │图片│ │图片│ │图片│                        │
│  └────┘ └────┘ └────┘                        │
└───────────────────────────────────────────────┘
```

**接口对接**：
```typescript
GET /api/products/{id}
Response: { id, name, price, stock, categoryId, imageUrl, sales }
```

**关键功能**：
- 显示商品详细信息
- 立即购买（跳转订单创建）
- 显示同类推荐商品

---

### 3.5 AI 拍照识别页 `/recognize` ⭐️ 核心功能

**设计要点**：
- 图片上传组件（拖拽或点击上传）
- 识别进度动画
- 识别结果展示
- 推荐商品列表

**页面结构**：
```
┌─────────────────────────────────────────────────┐
│            AI 智能识别 - 拍照识货                 │
└─────────────────────────────────────────────────┘
│                                                 │
│  第一步：上传零食图片                            │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │         [点击或拖拽上传图片]             │   │
│  │                                         │   │
│  │      支持 JPG/PNG，最大 5MB              │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ↓ 上传后显示                                   │
│                                                 │
│  识别中...                                      │
│  [=================] 80%                       │
│                                                 │
│  ↓ 识别完成后显示                               │
│                                                 │
│  识别结果                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  识别到 4 个零食目标                            │
│  主要类别: Cheetoz 车轮零食                     │
│  置信度: 98.14%                                │
│                                                 │
│  为您推荐以下商品                                │
│  ┌────────┐ ┌────────┐ ┌────────┐             │
│  │  图片   │ │  图片   │ │  图片   │             │
│  │Cheetoz │ │Cheetoz │ │Cheetoz │             │
│  │车轮零食 │ │零食30g │ │零食90g │             │
│  │ ¥11.50 │ │ ¥5.00  │ │ ¥12.00 │             │
│  │[购买]   │ │[购买]   │ │[购买]   │             │
│  └────────┘ └────────┘ └────────┘             │
│                                                 │
│  [重新识别]                                     │
└─────────────────────────────────────────────────┘
```

**接口对接**：
```typescript
POST /api/products/recognize
Content-Type: multipart/form-data
Body: { file: File, uid: number }

Response: {
  status: 'success',
  message: '识别成功',
  requestId: 'xxx',
  products: [...],
  detections: [...],
  detectedCount: 4,
  categoryName: 'Cheetoz 车轮零食'
}
```

**关键功能**：
- 图片上传前验证（格式、大小）
- 上传进度显示
- 识别进度动画（Loading）
- 识别结果可视化展示
- 推荐商品一键购买
- 识别历史记录

**交互流程**：
```
1. 用户上传图片
   ↓
2. 显示 Loading（识别中...）
   ↓
3. 调用后端识别接口
   ↓
4. 后端调用 YOLO 模型识别
   ↓
5. 返回识别结果和推荐商品
   ↓
6. 展示识别结果和推荐商品
   ↓
7. 用户点击商品可查看详情或购买
```

---

### 3.6 订单列表页 `/orders`

**设计要点**：
- 订单状态筛选（全部、待支付、待发货、已完成、已取消）
- 订单卡片展示
- 订单操作（查看详情、支付、取消）

**页面结构**：
```
┌─────────────────────────────────────────────────┐
│  我的订单                                        │
│  [全部] [待支付] [待发货] [已完成] [已取消]      │
└─────────────────────────────────────────────────┘
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 订单号: 202606220001     待支付          │   │
│  │ ─────────────────────────────────────   │   │
│  │ [图] Cheetoz 辣椒味薯片   x1   ¥10.00   │   │
│  │                                         │   │
│  │ 合计: ¥10.00      [立即支付] [取消订单] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 订单号: 202606210056     已完成          │   │
│  │ ─────────────────────────────────────   │   │
│  │ [图] Cheetoz 零食 30g     x2   ¥10.00   │   │
│  │                                         │   │
│  │ 合计: ¥10.00              [查看详情]     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [分页: 1 2 3 ...]                             │
└─────────────────────────────────────────────────┘
```

**接口对接**：
```typescript
GET /api/orders/list/{uid}
Response: {
  code: 200,
  data: [
    { id, pid, uid, productName, productPrice, number, status, createTime }
  ]
}
```

**关键功能**：
- 按状态筛选订单
- 显示订单商品信息
- 订单状态展示（待支付、已支付、已取消等）
- 订单操作（支付、取消、查看详情）

---

### 3.7 订单详情页 `/orders/:id`

**页面结构**：
```
┌─────────────────────────────────────────────────┐
│  订单详情                                        │
└─────────────────────────────────────────────────┘
│                                                 │
│  订单信息                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  订单号: 202606220001                           │
│  下单时间: 2026-06-22 10:30:00                  │
│  订单状态: 待支付                                │
│                                                 │
│  商品信息                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  ┌────────────────────────────────────────┐   │
│  │ [图] Cheetoz 辣椒味薯片                 │   │
│  │ 单价: ¥10.00    数量: x1               │   │
│  │ 小计: ¥10.00                           │   │
│  └────────────────────────────────────────┘   │
│                                                 │
│  费用明细                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  商品总价: ¥10.00                               │
│  运费: ¥0.00                                    │
│  ─────────────────                             │
│  应付金额: ¥10.00                               │
│                                                 │
│  [立即支付] [取消订单] [返回列表]                │
└─────────────────────────────────────────────────┘
```

**接口对接**：
```typescript
GET /api/orders/{id}
Response: {
  id, pid, uid, username, productName, productPrice,
  number, status, version
}
```

---

### 3.8 用户中心页 `/user`

**设计要点**：
- 用户信息展示
- 订单统计
- 识别历史记录
- 退出登录

**页面结构**：
```
┌─────────────────────────────────────────────────┐
│  个人中心                                        │
└─────────────────────────────────────────────────┘
│                                                 │
│  ┌────────┬──────────────────────────────┐     │
│  │        │  用户名: admin                │     │
│  │ 头像   │  ID: 1                        │     │
│  │        │  注册时间: 2026-01-01         │     │
│  └────────┴──────────────────────────────┘     │
│                                                 │
│  我的数据                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  ┌─────┐  ┌─────┐  ┌─────┐                    │
│  │ 12  │  │  8  │  │ 25  │                    │
│  │订单数│  │待支付│  │识别次数│                    │
│  └─────┘  └─────┘  └─────┘                    │
│                                                 │
│  快捷入口                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  [我的订单] [识别历史] [账号设置] [退出登录]    │
│                                                 │
│  识别历史（最近5次）                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  1. Cheetoz 车轮零食  2026-06-22 10:30         │
│  2. Maz Maz 土豆条    2026-06-21 15:20         │
│  3. Mini Lina 饼干    2026-06-20 09:10         │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

---

## 四、技术实现细节

### 4.1 状态管理（Pinia）

#### User Store
```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)
  
  const isLoggedIn = computed(() => !!token.value)
  
  const login = async (username: string, password: string) => {
    const res = await loginApi(username, password)
    token.value = res.data.token
    userInfo.value = {
      userId: res.data.userId,
      username: res.data.username
    }
    localStorage.setItem('token', token.value)
  }
  
  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }
  
  return { token, userInfo, isLoggedIn, login, logout }
})
```

#### Product Store
```typescript
// stores/product.ts
export const useProductStore = defineStore('product', () => {
  const categories = ref<Category[]>([])
  const currentCategory = ref<number | null>(null)
  
  const loadCategories = async () => {
    // 加载商品分类
  }
  
  return { categories, currentCategory, loadCategories }
})
```

### 4.2 API 封装

```typescript
// api/product.ts
export const getProductDetail = (pid: number) => {
  return request.get<Product>(`/products/${pid}`)
}

export const recognizeImage = (file: File, uid?: number) => {
  const formData = new FormData()
  formData.append('file', file)
  if (uid) formData.append('uid', uid.toString())
  
  return request.post<RecognitionResponse>('/products/recognize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getRecommendProducts = (categoryId: number, limit: number = 10) => {
  return request.get<Product[]>('/products/recommend', {
    params: { categoryId, limit }
  })
}
```

### 4.3 路由守卫

```typescript
// router/index.ts
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})
```

---

## 五、UI/UX 设计规范

### 5.1 颜色系统

```scss
// 主色
$primary-color: #409EFF;      // Element Plus 蓝
$success-color: #67C23A;      // 成功绿
$warning-color: #E6A23C;      // 警告橙
$danger-color: #F56C6C;       // 危险红

// 辅助色
$text-primary: #303133;       // 主要文字
$text-regular: #606266;       // 常规文字
$text-secondary: #909399;     // 次要文字
$border-color: #DCDFE6;       // 边框色
$bg-color: #F5F7FA;           // 背景色
```

### 5.2 字体规范

```scss
$font-size-large: 18px;
$font-size-medium: 16px;
$font-size-base: 14px;
$font-size-small: 12px;
```

### 5.3 间距规范

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
```

---

## 六、响应式设计

### 断点定义

```scss
// 小于 768px - 移动端
@media (max-width: 768px) {
  // 单列布局
  // 隐藏侧边栏
}

// 768px - 1024px - 平板
@media (min-width: 768px) and (max-width: 1024px) {
  // 两列布局
}

// 大于 1024px - 桌面端
@media (min-width: 1024px) {
  // 多列布局
}
```

---

## 七、性能优化

### 7.1 图片优化
- 懒加载
- WebP 格式
- 响应式图片
- 占位图兜底

### 7.2 代码分割
- 路由懒加载
- 组件异步加载
- 第三方库按需引入

### 7.3 缓存策略
- 商品列表缓存
- 用户信息缓存
- 静态资源缓存

---

## 八、开发路线图

### Phase 1: 核心功能（1-2周）
- [ ] 登录页面
- [ ] 首页
- [ ] 商品列表页
- [ ] 商品详情页
- [ ] AI 识别页（核心）

### Phase 2: 订单功能（1周）
- [ ] 订单创建
- [ ] 订单列表
- [ ] 订单详情
- [ ] 订单支付

### Phase 3: 用户功能（3-5天）
- [ ] 用户中心
- [ ] 识别历史
- [ ] 个人信息管理

### Phase 4: 优化完善（1周）
- [ ] 响应式适配
- [ ] 性能优化
- [ ] 错误处理
- [ ] 用户体验优化

---

## 九、部署方案

### 开发环境
```bash
npm run dev
# 访问 http://localhost:5173
```

### 生产构建
```bash
npm run build
# 输出到 dist/ 目录
```

### Nginx 配置
```nginx
server {
    listen 80;
    server_name shop.example.com;
    
    root /var/www/shop-web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 十、总结

### 核心特色
1. **AI 识别购物**：创新的购物体验，拍照即可识别并推荐商品
2. **微服务对接**：完整对接后端微服务架构
3. **现代化技术**：Vue 3 + TypeScript + Element Plus
4. **完善的交互**：Loading、错误提示、空状态等细节处理

### 技术亮点
- Composition API
- TypeScript 严格模式
- Pinia 状态管理
- 图片懒加载和优化
- 响应式设计

### 开发建议
1. **优先开发 AI 识别页**：这是项目的核心亮点
2. **使用组件库**：Element Plus 提供完整的组件支持
3. **先占位图后真图**：使用 Unsplash/Placeholder 快速启动
4. **充分测试**：特别是图片上传和识别流程

---

**文档版本**: v1.0  
**创建时间**: 2026-06-22  
**适用项目**: YQSX 智能零食商城前端
