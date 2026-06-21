# 前后端对接文档

## 一、对接概述

### 1.1 对接方式

- **通信协议**：HTTP/HTTPS
- **数据格式**：JSON / multipart/form-data（文件上传）
- **统一入口**：`http://localhost:8080/api/**`（Gateway）
- **认证方式**：JWT Token（`Authorization: Bearer <token>`）

### 1.2 前端技术栈

当前已实现的前端项目 `shop-web-next` 使用以下技术栈：

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Next.js | 16.x | React 全栈前端框架 |
| React | 19.x | UI 库 |
| TypeScript | 5.x | 类型系统 |
| Tailwind CSS | 4.x | 样式方案 |
| Zustand | 5.x | 状态管理 |
| shadcn/ui | latest | UI 组件库 |
| Axios | 1.x | HTTP 客户端 |

> 项目中同时保留 `shop-web`（Vue3 + Vite + Pinia）示例，但当前主流程验证基于 `shop-web-next`。

---

## 二、统一请求封装

### 2.1 Axios 封装示例

```typescript
// src/utils/request.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';

const request: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：注入 Token
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    const token = userStore.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录');
          // 跳转到登录页
          break;
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试');
          break;
        case 503:
          ElMessage.error('服务暂时不可用，请稍后再试');
          break;
        default:
          ElMessage.error(error.response.data?.msg || '请求失败');
      }
    }
    return Promise.reject(error);
  }
);

export default request;
```

### 2.2 文件上传封装

```typescript
// src/utils/upload.ts
import axios from 'axios';

export function uploadImage(url: string, file: File, params?: Record<string, any>) {
  const formData = new FormData();
  formData.append('file', file);
  
  if (params) {
    Object.keys(params).forEach(key => {
      formData.append(key, params[key]);
    });
  }

  return axios.post(url, formData, {
    baseURL: 'http://localhost:8080/api',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 60000
  });
}
```

---

## 三、核心页面对接

### 3.1 登录页面

**页面路径**：`/login`

**接口**：
```
POST /user/login?username={username}&password={password}
```

> 注意：当前后端使用 `@RequestParam` 接收参数，前端需使用 query 参数或 form-data，不要使用 JSON body。

**请求示例**：
```typescript
const login = async (username: string, password: string) => {
  const res = await request.post(`/user/login?username=${username}&password=${password}`);
  if (res.data.code === 200) {
    userStore.setToken(res.data.token);
    userStore.setUserInfo({
      userId: res.data.userId,
      username: res.data.username
    });
  }
  return res.data;
};
```

---

### 3.2 商品列表页面

**页面路径**：`/products`

**接口**：
```
GET /products/{pid}
GET /products/recommend?categoryId={categoryId}&limit={limit}
```

**示例**：
```typescript
// 商品详情
const getProductDetail = (pid: number) => {
  return request.get(`/products/${pid}`);
};

// 推荐商品
const getRecommendProducts = (categoryId: number, limit: number = 10) => {
  return request.get(`/products/recommend`, {
    params: { categoryId, limit }
  });
};
```

---

### 3.3 拍照识别页面

**页面路径**：`/recognize`

**功能**：
1. 用户上传图片
2. 后端调用 YOLO 模型识别
3. 展示识别结果和推荐商品

**接口**：
```
POST /products/recognize
Content-Type: multipart/form-data
file: <图片文件>
uid: <用户ID，可选>
```

**示例**：
```vue
<template>
  <div class="recognize-page">
    <el-upload
      action="#"
      :auto-upload="false"
      :on-change="handleFileChange"
      accept="image/*"
    >
      <el-button type="primary">选择图片</el-button>
    </el-upload>
    
    <el-button type="success" @click="handleRecognize" :loading="loading">
      开始识别
    </el-button>
    
    <!-- 识别结果 -->
    <div v-if="result">
      <h3>识别结果</h3>
      <p>状态：{{ result.status }}</p>
      <p>识别到 {{ result.detectedCount }} 个目标</p>
      <p>推荐类别：{{ result.categoryName }}</p>
      
      <!-- 推荐商品 -->
      <el-row :gutter="20">
        <el-col :span="6" v-for="product in result.products" :key="product.id">
          <el-card>
            <img :src="product.imageUrl" style="width: 100%" />
            <div>{{ product.name }}</div>
            <div>¥{{ product.price }}</div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { uploadImage } from '@/utils/upload';

const file = ref<File | null>(null);
const loading = ref(false);
const result = ref<any>(null);

const handleFileChange = (uploadFile: any) => {
  file.value = uploadFile.raw;
};

const handleRecognize = async () => {
  if (!file.value) {
    ElMessage.warning('请先选择图片');
    return;
  }
  
  loading.value = true;
  try {
    const userStore = useUserStore();
    const res = await uploadImage('/products/recognize', file.value, {
      uid: userStore.userInfo?.userId
    });
    result.value = res.data;
  } finally {
    loading.value = false;
  }
};
</script>
```

---

### 3.4 订单创建页面

**页面路径**：`/orders/create`

**接口**：
```
POST /orders/save
Content-Type: application/x-www-form-urlencoded
pid: <商品ID>
uid: <用户ID>
```

**示例**：
```typescript
const createOrder = (pid: number, uid: number) => {
  const params = new URLSearchParams();
  params.append('pid', pid.toString());
  params.append('uid', uid.toString());
  
  return request.post('/orders/save', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
};
```

---

### 3.5 订单支付页面

**页面路径**：`/orders/[id]` 内嵌支付

**接口**：
```
POST /payment/pay
Content-Type: application/x-www-form-urlencoded
orderId: <订单ID>
```

**示例**：
```typescript
const payOrder = (orderId: number) => {
  const params = new URLSearchParams();
  params.append('orderId', orderId.toString());

  return request.post('/payment/pay', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
};
```

### 3.6 订单列表页面

**页面路径**：`/orders`

**接口**：
```
GET /orders/list/{uid}
```

**示例**：
```typescript
const getOrderList = (uid: number) => {
  return request.get(`/orders/list/${uid}`);
};
```

---

## 四、状态管理

### 4.1 用户状态 Pinia Store

```typescript
// src/stores/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '');
  const userInfo = ref<any>(null);
  
  const isLoggedIn = computed(() => !!token.value);
  
  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  };
  
  const setUserInfo = (info: any) => {
    userInfo.value = info;
  };
  
  const logout = () => {
    token.value = '';
    userInfo.value = null;
    localStorage.removeItem('token');
  };
  
  return {
    token,
    userInfo,
    isLoggedIn,
    setToken,
    setUserInfo,
    logout
  };
});
```

---

## 五、路由守卫

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/Login.vue') },
    { path: '/products', component: () => import('@/views/Products.vue') },
    { path: '/recognize', component: () => import('@/views/Recognize.vue'), meta: { requiresAuth: true } },
    { path: '/orders', component: () => import('@/views/Orders.vue'), meta: { requiresAuth: true } }
  ]
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login');
  } else {
    next();
  }
});

export default router;
```

---

## 六、错误码对照表

| 状态码 | 含义 | 前端处理 |
|-------|------|---------|
| 200 | 成功 | 正常处理 |
| 400 | 请求参数错误 | 提示用户检查输入 |
| 401 | 未认证或 Token 过期 | 跳转登录页 |
| 403 | 无权限 | 提示权限不足 |
| 404 | 资源不存在 | 提示未找到 |
| 429 | 限流 | 提示稍后重试 |
| 500 | 服务器内部错误 | 提示系统繁忙 |
| 503 | 服务不可用 | 提示稍后重试 |

---

## 七、开发 checklist

- [x] 统一使用 `/api` 作为 baseURL，通过 Next.js 代理到 Gateway
- [x] 登录后将 token 存入 Zustand 和 localStorage/Cookie
- [x] 每次请求自动携带 `Authorization: Bearer <token>`
- [x] 登录接口使用 JSON body，不通过 URL query 传递密码
- [x] 文件上传使用 multipart/form-data
- [x] 订单/支付接口使用 application/x-www-form-urlencoded
- [x] 401 统一跳转登录页
- [x] 429/503 提示用户稍后重试
- [ ] 图片上传前进行大小和格式校验
- [ ] 识别结果中的 `imageUrl` 需要拼接完整路径

---

**文档生成时间**: 2026-06-20
