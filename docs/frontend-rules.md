# Vue3前端开发规范

## 技术栈

- **Vue 3.x**：渐进式JavaScript框架
- **TypeScript 5.x**：类型系统
- **Vite 5.x**：构建工具
- **Pinia 2.x**：状态管理
- **Vue Router 4.x**：路由管理
- **Element Plus 2.x**：UI组件库
- **Axios**：HTTP客户端
- **VueUse**：Vue组合式API工具集

## 项目结构

```
src/
├── api/                    # API接口
│   ├── user.ts
│   ├── product.ts
│   └── types/             # 接口类型定义
│       ├── user.ts
│       └── product.ts
│
├── assets/                # 静态资源
│   ├── images/
│   ├── styles/
│   │   ├── index.scss     # 全局样式
│   │   ├── variables.scss # SCSS变量
│   │   └── mixins.scss    # SCSS混入
│   └── icons/
│
├── components/            # 全局组件
│   ├── common/           # 通用组件
│   │   ├── Table/
│   │   ├── Form/
│   │   └── Dialog/
│   └── business/         # 业务组件
│
├── composables/          # 组合式函数
│   ├── useTable.ts
│   ├── useForm.ts
│   └── usePermission.ts
│
├── directives/           # 自定义指令
│   ├── permission.ts
│   └── loading.ts
│
├── hooks/                # Hooks（弃用，使用composables）
│
├── layouts/              # 布局组件
│   ├── DefaultLayout.vue
│   └── components/
│
├── router/               # 路由配置
│   ├── index.ts
│   ├── modules/
│   └── guards.ts
│
├── stores/               # Pinia状态管理
│   ├── user.ts
│   ├── permission.ts
│   └── app.ts
│
├── types/                # 全局类型定义
│   ├── global.d.ts
│   └── env.d.ts
│
├── utils/                # 工具函数
│   ├── request.ts        # Axios封装
│   ├── validate.ts       # 表单验证
│   ├── format.ts         # 格式化工具
│   └── storage.ts        # 本地存储
│
├── views/                # 页面组件
│   ├── home/
│   ├── user/
│   │   ├── index.vue
│   │   ├── components/
│   │   │   └── UserForm.vue
│   │   └── types.ts
│   └── product/
│
├── App.vue               # 根组件
├── main.ts               # 入口文件
└── env.d.ts             # 环境变量类型
```

## 编码规范

### 1. 使用Composition API

**✅ 正确**：
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

const increment = () => {
  count.value++
}

onMounted(() => {
  console.log('mounted')
})
</script>
```

**❌ 错误**：
```vue
<script lang="ts">
export default {
  data() {
    return {
      count: 0
    }
  },
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
```

### 2. TypeScript严格模式

**tsconfig.json**：
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**✅ 正确**：
```typescript
interface User {
  id: number
  name: string
  email?: string
}

const user = ref<User>({
  id: 1,
  name: 'John'
})

const updateUser = (data: Partial<User>) => {
  user.value = { ...user.value, ...data }
}
```

**❌ 错误**：
```typescript
// 使用any
const user = ref<any>({})

// 未定义类型
const updateUser = (data) => {
  user.value = { ...user.value, ...data }
}
```

### 3. 禁止使用any

使用具体类型或泛型代替：

**✅ 正确**：
```typescript
// 使用具体类型
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 使用泛型
function request<T>(url: string): Promise<ApiResponse<T>> {
  return axios.get(url)
}

// 使用unknown
function handleData(data: unknown) {
  if (typeof data === 'string') {
    console.log(data.toUpperCase())
  }
}
```

**❌ 错误**：
```typescript
function request(url: string): Promise<any> {
  return axios.get(url)
}

function handleData(data: any) {
  console.log(data.toUpperCase())
}
```

## 组件规范

### 1. 组件命名

- 文件名：PascalCase（大驼峰）
- 组件名：PascalCase

```
UserList.vue
UserForm.vue
ProductCard.vue
```

### 2. 组件结构

```vue
<template>
  <div class="user-list">
    <!-- 模板内容 -->
  </div>
</template>

<script setup lang="ts">
// 1. 导入依赖
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

// 2. 定义Props
interface Props {
  userId?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// 3. 定义Emits
interface Emits {
  (e: 'update', value: User): void
  (e: 'delete', id: number): void
}

const emit = defineEmits<Emits>()

// 4. 响应式状态
const loading = ref(false)
const userData = ref<User>()

// 5. 计算属性
const isAdmin = computed(() => userData.value?.role === 'admin')

// 6. 方法
const loadData = async () => {
  loading.value = true
  try {
    const res = await getUserById(props.userId)
    userData.value = res.data
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 7. 生命周期
onMounted(() => {
  loadData()
})

// 8. 暴露给父组件（如需要）
defineExpose({
  loadData
})
</script>

<style scoped lang="scss">
.user-list {
  // 样式
}
</style>
```

### 3. Props定义

```typescript
// 基础类型
interface Props {
  id: number
  name: string
  disabled?: boolean
  type?: 'primary' | 'success' | 'warning' | 'danger'
}

// 复杂类型
interface User {
  id: number
  name: string
}

interface Props {
  user: User
  list: User[]
  config?: Record<string, any>
}

// 带默认值
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  type: 'primary',
  list: () => []
})
```

### 4. Emits定义

```typescript
// 基础定义
interface Emits {
  (e: 'update', value: string): void
  (e: 'delete', id: number): void
  (e: 'submit', data: FormData): void
}

const emit = defineEmits<Emits>()

// 使用
emit('update', 'new value')
emit('delete', 123)
```

### 5. v-model绑定

```vue
<script setup lang="ts">
interface Props {
  modelValue: string
}

const props = defineProps<Props>()

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const emit = defineEmits<Emits>()

const handleInput = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <input :value="modelValue" @input="handleInput($event.target.value)" />
</template>
```

使用：
```vue
<CustomInput v-model="inputValue" />
```

## 状态管理 - Pinia

### 1. Store定义

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types/user'

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref<string>('')
  const userInfo = ref<User>()
  const permissions = ref<string[]>([])

  // Getters
  const isLogin = computed(() => !!token.value)
  const userName = computed(() => userInfo.value?.name || '')
  
  const hasPermission = computed(() => {
    return (permission: string) => {
      return permissions.value.includes(permission)
    }
  })

  // Actions
  const login = async (username: string, password: string) => {
    const res = await loginApi({ username, password })
    token.value = res.data.token
    userInfo.value = res.data.user
    permissions.value = res.data.permissions
    localStorage.setItem('token', token.value)
  }

  const logout = () => {
    token.value = ''
    userInfo.value = undefined
    permissions.value = []
    localStorage.removeItem('token')
  }

  const updateUserInfo = (data: Partial<User>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...data }
    }
  }

  return {
    // State
    token,
    userInfo,
    permissions,
    // Getters
    isLogin,
    userName,
    hasPermission,
    // Actions
    login,
    logout,
    updateUserInfo
  }
})
```

### 2. Store使用

```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 访问state
console.log(userStore.token)

// 访问getter
console.log(userStore.isLogin)

// 调用action
const handleLogin = async () => {
  await userStore.login('admin', 'password')
}

// 解构（需要storeToRefs）
import { storeToRefs } from 'pinia'
const { token, userInfo } = storeToRefs(userStore)
const { login, logout } = userStore
</script>
```

## 路由管理

### 1. 路由配置

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: {
          title: '首页',
          icon: 'home',
          requiresAuth: true
        }
      },
      {
        path: 'user',
        name: 'User',
        component: () => import('@/views/user/index.vue'),
        meta: {
          title: '用户管理',
          icon: 'user',
          requiresAuth: true,
          permission: 'system:user:list'
        }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### 2. 路由守卫

```typescript
// router/guards.ts
import router from './index'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  // 设置标题
  document.title = to.meta.title ? `${to.meta.title} - 系统名称` : '系统名称'

  // 白名单
  const whiteList = ['/login', '/register']
  if (whiteList.includes(to.path)) {
    next()
    return
  }

  // 检查登录
  if (!userStore.isLogin) {
    next('/login')
    return
  }

  // 检查权限
  if (to.meta.permission) {
    const hasPermission = permissionStore.hasPermission(to.meta.permission as string)
    if (!hasPermission) {
      next('/403')
      return
    }
  }

  next()
})
```

## API请求

### 1. Axios封装

```typescript
// utils/request.ts
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
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
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data

    if (code === 200) {
      return data
    } else if (code === 401) {
      // 未登录
      const userStore = useUserStore()
      userStore.logout()
      window.location.href = '/login'
      return Promise.reject(new Error(message))
    } else {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }
  },
  (error) => {
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default service
```

### 2. API定义

```typescript
// api/user.ts
import request from '@/utils/request'
import type { User, UserQuery, UserForm } from './types/user'
import type { PageResult } from '@/types/global'

export const getUserList = (params: UserQuery) => {
  return request<PageResult<User>>({
    url: '/api/v1/users',
    method: 'get',
    params
  })
}

export const getUserById = (id: number) => {
  return request<User>({
    url: `/api/v1/users/${id}`,
    method: 'get'
  })
}

export const createUser = (data: UserForm) => {
  return request({
    url: '/api/v1/users',
    method: 'post',
    data
  })
}

export const updateUser = (id: number, data: UserForm) => {
  return request({
    url: `/api/v1/users/${id}`,
    method: 'put',
    data
  })
}

export const deleteUser = (id: number) => {
  return request({
    url: `/api/v1/users/${id}`,
    method: 'delete'
  })
}
```

### 3. 类型定义

```typescript
// api/types/user.ts
export interface User {
  id: number
  username: string
  nickname: string
  mobile: string
  email: string
  avatar: string
  status: number
  createTime: string
  updateTime: string
}

export interface UserQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
  status?: number
}

export interface UserForm {
  username: string
  password?: string
  nickname: string
  mobile: string
  email?: string
  status: number
  roleIds: number[]
}
```

## 组合式函数（Composables）

### 1. useTable

```typescript
// composables/useTable.ts
import { ref, reactive } from 'vue'
import type { Ref } from 'vue'

interface TableOptions<T, Q> {
  fetchApi: (query: Q) => Promise<{ list: T[]; total: number }>
  defaultQuery?: Partial<Q>
}

export function useTable<T, Q extends Record<string, any>>(options: TableOptions<T, Q>) {
  const { fetchApi, defaultQuery = {} } = options

  const loading = ref(false)
  const tableData = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  
  const query = reactive<Q>({
    pageNum: 1,
    pageSize: 10,
    ...defaultQuery
  } as Q)

  const loadData = async () => {
    loading.value = true
    try {
      const res = await fetchApi(query)
      tableData.value = res.list
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  const handlePageChange = (page: number) => {
    query.pageNum = page
    loadData()
  }

  const handleSizeChange = (size: number) => {
    query.pageNum = 1
    query.pageSize = size
    loadData()
  }

  const handleSearch = () => {
    query.pageNum = 1
    loadData()
  }

  const handleReset = () => {
    Object.assign(query, {
      pageNum: 1,
      pageSize: 10,
      ...defaultQuery
    })
    loadData()
  }

  return {
    loading,
    tableData,
    total,
    query,
    loadData,
    handlePageChange,
    handleSizeChange,
    handleSearch,
    handleReset
  }
}
```

使用：
```vue
<script setup lang="ts">
import { useTable } from '@/composables/useTable'
import { getUserList } from '@/api/user'
import type { User, UserQuery } from '@/api/types/user'

const {
  loading,
  tableData,
  total,
  query,
  loadData,
  handlePageChange,
  handleSizeChange,
  handleSearch,
  handleReset
} = useTable<User, UserQuery>({
  fetchApi: getUserList
})

onMounted(() => {
  loadData()
})
</script>
```

### 2. useForm

```typescript
// composables/useForm.ts
import { ref, reactive } from 'vue'
import type { Ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

interface FormOptions<T> {
  initialData: T
  rules?: FormRules
}

export function useForm<T extends Record<string, any>>(options: FormOptions<T>) {
  const { initialData, rules } = options

  const formRef = ref<FormInstance>()
  const formData = reactive<T>({ ...initialData })
  const formRules = rules || {}

  const resetForm = () => {
    Object.assign(formData, initialData)
    formRef.value?.clearValidate()
  }

  const validateForm = async (): Promise<boolean> => {
    if (!formRef.value) return false
    try {
      await formRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  return {
    formRef,
    formData,
    formRules,
    resetForm,
    validateForm
  }
}
```

## 样式规范

### 1. BEM命名规范

```scss
// Block
.user-list {
  // Element
  &__header {
    // ...
  }

  &__body {
    // ...
  }

  &__item {
    // Modifier
    &--active {
      // ...
    }

    &--disabled {
      // ...
    }
  }
}
```

### 2. SCSS变量

```scss
// assets/styles/variables.scss
// 颜色
$primary-color: #409eff;
$success-color: #67c23a;
$warning-color: #e6a23c;
$danger-color: #f56c6c;
$info-color: #909399;

// 字体
$font-size-base: 14px;
$font-size-small: 12px;
$font-size-large: 16px;

// 间距
$spacing-small: 8px;
$spacing-base: 16px;
$spacing-large: 24px;

// 圆角
$border-radius-base: 4px;
$border-radius-small: 2px;
$border-radius-large: 8px;
```

### 3. Scoped样式

```vue
<style scoped lang="scss">
// 局部样式
.user-list {
  padding: 20px;
}

// 深度选择器（影响子组件）
:deep(.el-button) {
  margin-right: 10px;
}

// 插槽选择器
:slotted(.custom-class) {
  color: red;
}

// 全局选择器
:global(.global-class) {
  color: blue;
}
</style>
```

## 性能优化

### 1. 懒加载

```typescript
// 路由懒加载
const routes = [
  {
    path: '/user',
    component: () => import('@/views/user/index.vue')
  }
]

// 组件懒加载
import { defineAsyncComponent } from 'vue'

const AsyncComp = defineAsyncComponent(() => 
  import('@/components/HeavyComponent.vue')
)
```

### 2. keep-alive缓存

```vue
<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['UserList', 'ProductList']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>
```

### 3. 虚拟列表

对于大数据列表，使用虚拟滚动：

```vue
<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  largeList,
  { itemHeight: 50 }
)
</script>

<template>
  <div v-bind="containerProps" style="height: 400px">
    <div v-bind="wrapperProps">
      <div v-for="item in list" :key="item.index">
        {{ item.data }}
      </div>
    </div>
  </div>
</template>
```

## 测试规范

### 1. 单元测试

```typescript
// __tests__/UserList.spec.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import UserList from '@/views/user/index.vue'

describe('UserList', () => {
  it('renders properly', () => {
    const wrapper = mount(UserList)
    expect(wrapper.exists()).toBe(true)
  })

  it('loads data on mount', async () => {
    const wrapper = mount(UserList)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.tableData.length).toBeGreaterThan(0)
  })
})
```

## 最佳实践

1. **组件拆分**：单个组件不超过300行
2. **类型安全**：充分利用TypeScript类型系统
3. **代码复用**：抽取公共逻辑为composables
4. **命名规范**：统一使用驼峰命名
5. **注释文档**：复杂逻辑添加注释
6. **错误处理**：统一异常处理机制
7. **加载状态**：提供友好的加载提示
8. **空状态**：处理数据为空的情况
9. **权限控制**：按钮级别的权限控制
10. **响应式设计**：适配不同屏幕尺寸

## 禁止事项

1. ❌ 禁止使用Options API
2. ❌ 禁止使用any类型
3. ❌ 禁止在组件中直接调用axios
4. ❌ 禁止在template中写复杂逻辑
5. ❌ 禁止修改props
6. ❌ 禁止在computed中修改state
7. ❌ 禁止使用var声明变量
8. ❌ 禁止直接操作DOM

## 参考资料

- [Vue 3官方文档](https://cn.vuejs.org/)
- [TypeScript官方文档](https://www.typescriptlang.org/)
- [Pinia官方文档](https://pinia.vuejs.org/)
- [Element Plus官方文档](https://element-plus.org/)
- [VueUse工具库](https://vueuse.org/)
