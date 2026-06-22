# 前端项目快速启动指南

## 一、环境准备

### 1.1 必需软件

| 软件 | 版本要求 | 下载地址 |
|-----|---------|---------|
| Node.js | 18.x+ | https://nodejs.org/ |
| npm | 9.x+ | 随 Node.js 安装 |
| VS Code | 最新版 | https://code.visualstudio.com/ |
| Git | 最新版 | https://git-scm.com/ |

### 1.2 VS Code 推荐插件

```
- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- Auto Rename Tag
- Path Intellisense
```

---

## 二、项目初始化

### 2.1 创建项目

```bash
# 进入项目根目录
cd d:/Programming/YQSX

# 使用 Vite 创建 Vue 3 + TypeScript 项目
npm create vite@latest shop-web -- --template vue-ts

# 进入项目目录
cd shop-web

# 安装依赖
npm install
```

### 2.2 安装核心依赖

```bash
# Element Plus - UI 组件库
npm install element-plus

# Element Plus 图标
npm install @element-plus/icons-vue

# Pinia - 状态管理
npm install pinia

# Vue Router - 路由管理
npm install vue-router@4

# Axios - HTTP 客户端
npm install axios

# VueUse - 工具库
npm install @vueuse/core

# Day.js - 日期处理
npm install dayjs

# 开发依赖
npm install -D sass @types/node
```

### 2.3 项目目录结构创建

```bash
# Windows PowerShell 执行
mkdir src/api, src/api/types, src/assets/images, src/assets/styles, src/components/common, src/components/business, src/composables, src/router, src/stores, src/types, src/utils, src/views/home, src/views/product, src/views/order, src/views/recognize, src/views/user, src/views/login
```

---

## 三、核心配置文件

### 3.1 vite.config.ts

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### 3.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3.3 .env.development

```env
# 开发环境配置
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=智能零食商城
```

### 3.4 .env.production

```env
# 生产环境配置
VITE_API_BASE_URL=https://api.example.com/api
VITE_APP_TITLE=智能零食商城
```

---

## 四、核心代码文件

### 4.1 src/main.ts

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './assets/styles/index.scss'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
```

### 4.2 src/utils/request.ts

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          const userStore = useUserStore()
          userStore.logout()
          window.location.href = '/login'
          break
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试')
          break
        case 503:
          ElMessage.error('服务暂时不可用，请稍后再试')
          break
        default:
          ElMessage.error(error.response.data?.msg || '请求失败')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default request
```

### 4.3 src/stores/user.ts

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi } from '@/api/user'

export interface UserInfo {
  userId: number
  username: string
}

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

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout
  }
})
```

### 4.4 src/api/user.ts

```typescript
import request from '@/utils/request'

export const loginApi = (username: string, password: string) => {
  return request.post(`/user/login?username=${username}&password=${password}`)
}

export const getCurrentUser = () => {
  return request.get('/user/current')
}
```

### 4.5 src/api/product.ts

```typescript
import request from '@/utils/request'

export interface Product {
  id: number
  name: string
  price: number
  stock: number
  categoryId: number
  imageUrl: string
  sales: number
}

export const getProductDetail = (pid: number) => {
  return request.get<Product>(`/products/${pid}`)
}

export const getRecommendProducts = (categoryId: number, limit: number = 10) => {
  return request.get<Product[]>('/products/recommend', {
    params: { categoryId, limit }
  })
}

export const recognizeImage = (file: File, uid?: number) => {
  const formData = new FormData()
  formData.append('file', file)
  if (uid) formData.append('uid', uid.toString())

  return request.post('/products/recognize', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
```

### 4.6 src/router/index.ts

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue')
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/home/index.vue')
      },
      {
        path: 'products',
        name: 'ProductList',
        component: () => import('@/views/product/index.vue')
      },
      {
        path: 'products/:id',
        name: 'ProductDetail',
        component: () => import('@/views/product/detail.vue')
      },
      {
        path: 'recognize',
        name: 'Recognize',
        component: () => import('@/views/recognize/index.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'orders',
        name: 'OrderList',
        component: () => import('@/views/order/index.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/detail.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'user',
        name: 'UserCenter',
        component: () => import('@/views/user/index.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
```

### 4.7 src/assets/styles/index.scss

```scss
// 全局样式
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  color: #303133;
  background-color: #f5f7fa;
}

// 滚动条样式
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

// 通用类
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.text-center {
  text-align: center;
}

.mt-20 {
  margin-top: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}
```

---

## 五、启动项目

### 5.1 启动后端服务

确保以下服务已启动：
```
- Nacos (8848)
- MySQL (3306)
- Redis (6379)
- Gateway (8080)
- Product Service (8081)
- Order Service (8091)
- User Service (8083)
- Payment Service (8084)
- Recognition Service (8086)
```

### 5.2 更新商品图片

执行 SQL 脚本添加商品图片：
```bash
mysql -u root -p shop-product < d:/Programming/YQSX/update_product_images.sql
```

### 5.3 启动前端项目

```bash
cd d:/Programming/YQSX/shop-web

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

访问: http://localhost:5173

---

## 六、开发流程

### 6.1 创建新页面

1. 在 `src/views` 创建页面目录
2. 创建 `index.vue` 文件
3. 在 `router/index.ts` 添加路由
4. 在导航栏添加链接

### 6.2 创建新组件

1. 在 `src/components` 创建组件文件
2. 使用 `<script setup lang="ts">` 语法
3. 导出组件供页面使用

### 6.3 添加新 API

1. 在 `src/api` 创建 API 文件
2. 定义接口类型
3. 导出 API 函数

### 6.4 添加新 Store

1. 在 `src/stores` 创建 store 文件
2. 使用 `defineStore` 定义 store
3. 在组件中使用 store

---

## 七、常见问题

### 7.1 跨域问题

**问题**：前端调用后端 API 出现跨域错误

**解决**：
- 开发环境：vite.config.ts 已配置代理
- 生产环境：Nginx 配置反向代理

### 7.2 图片加载失败

**问题**：商品图片显示不出来

**解决**：
```vue
<el-image :src="product.imageUrl" fit="cover">
  <template #error>
    <div class="image-slot">
      <el-icon><Picture /></el-icon>
    </div>
  </template>
</el-image>
```

### 7.3 Token 过期

**问题**：Token 过期后未自动跳转登录

**解决**：已在 `request.ts` 响应拦截器处理

### 7.4 路由 404

**问题**：刷新页面出现 404

**解决**：
- 开发环境：vite 自动处理
- 生产环境：Nginx 配置 `try_files`

---

## 八、构建部署

### 8.1 构建生产版本

```bash
npm run build
```

### 8.2 预览生产构建

```bash
npm run preview
```

### 8.3 Nginx 部署

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 九、开发规范

### 9.1 命名规范

- **组件文件**：PascalCase（ProductList.vue）
- **工具函数**：camelCase（formatPrice.ts）
- **常量**：UPPER_SNAKE_CASE（API_BASE_URL）
- **CSS类**：kebab-case（product-card）

### 9.2 代码风格

- 使用 Composition API
- 使用 TypeScript 严格模式
- 禁止使用 any
- 组件 props 必须定义类型
- 接口必须定义返回类型

### 9.3 Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 十、下一步计划

### Phase 1：核心页面开发（优先）
- [ ] 登录页面
- [ ] 首页
- [ ] 商品列表
- [ ] AI 识别页（核心功能）

### Phase 2：订单功能
- [ ] 订单创建
- [ ] 订单列表
- [ ] 订单详情

### Phase 3：用户功能
- [ ] 用户中心
- [ ] 识别历史

### Phase 4：优化完善
- [ ] 响应式适配
- [ ] 性能优化
- [ ] 错误处理

---

## 十一、参考资料

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Vite 官方文档](https://cn.vitejs.dev/)
- [Element Plus 官方文档](https://element-plus.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)

---

## 十二、技术支持

如有问题，请参考：
- [前端设计方案](./frontend-design-plan.md)
- [前后端对接文档](./frontend-backend-integration.md)
- [商品图片解决方案](./product-images-solution.md)

---

**文档版本**: v1.0  
**创建时间**: 2026-06-22  
**适用项目**: YQSX 智能零食商城
