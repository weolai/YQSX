# 前端项目实施指南

## 📋 总览

本指南提供完整的前端项目实施步骤，基于方案 A（Unsplash 占位图）+ 开发建议。

---

## ✅ 第一步：更新商品图片（必须先执行）

### 方式 1：使用批处理脚本（推荐）

```bash
# Windows 环境
cd d:/Programming/YQSX
execute_update_images.bat
```

脚本会自动：
- 查找 MySQL 客户端
- 执行 SQL 更新脚本
- 验证执行结果

### 方式 2：手动执行 SQL

如果批处理脚本失败，请手动执行：

```bash
# 方法 1: 使用 MySQL 命令行
mysql -u root -p1234 shop-product < update_product_images.sql

# 方法 2: 使用 Navicat 等 GUI 工具
# 打开 update_product_images.sql 文件
# 选择 shop-product 数据库
# 执行整个脚本
```

### 验证更新结果

登录 MySQL 验证：

```sql
USE shop-product;
SELECT id, name, image_url FROM t_product ORDER BY id LIMIT 5;
```

应该看到类似：

```
+----+---------------------------+-------------------------------------------------------+
| id | name                      | image_url                                              |
+----+---------------------------+-------------------------------------------------------+
|  1 | Ashi Mashi 经典零食        | https://source.unsplash.com/400x400/?snack,chips,1     |
|  2 | Chee 番茄味薯片            | https://source.unsplash.com/400x400/?chips,ketchup     |
|  3 | Chee 醋味薯片              | https://source.unsplash.com/400x400/?chips,vinegar     |
+----+---------------------------+-------------------------------------------------------+
```

---

## 🚀 第二步：创建前端项目

### 2.1 环境检查

```bash
# 检查 Node.js 版本（需要 18.x+）
node -v

# 检查 npm 版本
npm -v

# 如果版本过低，请先升级 Node.js
```

### 2.2 创建 Vue3 + TypeScript 项目

```bash
# 进入项目根目录
cd d:/Programming/YQSX

# 创建 Vue 3 + TypeScript 项目（使用 Vite）
npm create vite@latest shop-web -- --template vue-ts

# 进入项目目录
cd shop-web

# 安装依赖
npm install
```

### 2.3 安装核心依赖

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

### 2.4 创建项目目录结构

```bash
# Windows PowerShell
mkdir src/api, src/api/types, src/assets/images, src/assets/styles, src/components/common, src/components/business, src/composables, src/router, src/stores, src/types, src/utils, src/views/home, src/views/product, src/views/order, src/views/recognize, src/views/user, src/views/login, src/layouts
```

---

## ⚙️ 第三步：配置核心文件

### 3.1 vite.config.ts

```bash
# 查看快速启动指南中的 vite.config.ts 配置
# 已在 docs/frontend-quickstart.md 第 84-108 行
```

### 3.2 tsconfig.json

```bash
# 查看快速启动指南中的 tsconfig.json 配置
# 已在 docs/frontend-quickstart.md 第 110-138 行
```

### 3.3 环境变量配置

```bash
# 创建 .env.development
echo "VITE_API_BASE_URL=http://localhost:8080/api" > .env.development
echo "VITE_APP_TITLE=智能零食商城" >> .env.development

# 创建 .env.production
echo "VITE_API_BASE_URL=https://api.example.com/api" > .env.production
echo "VITE_APP_TITLE=智能零食商城" >> .env.production
```

---

## 💻 第四步：创建核心代码文件

所有核心代码文件已在 `docs/frontend-quickstart.md` 中提供，包括：

| 文件 | 位置 | 说明 |
|-----|------|------|
| main.ts | 第 160-186 行 | 应用入口 |
| request.ts | 第 188-249 行 | Axios 封装 |
| user.ts (Store) | 第 251-293 行 | 用户状态管理 |
| user.ts (API) | 第 295-307 行 | 用户 API |
| product.ts (API) | 第 309-345 行 | 商品 API（含识别接口） |
| router/index.ts | 第 347-423 行 | 路由配置 |
| index.scss | 第 425-475 行 | 全局样式 |

### 创建方式

**方式 1：手动复制**
1. 打开 `docs/frontend-quickstart.md`
2. 复制对应代码段
3. 创建文件并粘贴

**方式 2：使用 AI 辅助**
1. 请 AI 根据文档创建所有核心文件
2. AI 会逐个创建文件并验证

---

## 🎨 第五步：创建布局组件

### 5.1 DefaultLayout.vue

创建 `src/layouts/DefaultLayout.vue`：

```vue
<template>
  <div class="layout">
    <header class="layout-header">
      <div class="container">
        <div class="logo">🍿 智能零食商城</div>
        <nav class="nav">
          <router-link to="/">首页</router-link>
          <router-link to="/products">商品</router-link>
          <router-link to="/recognize">AI识别</router-link>
          <router-link to="/orders">订单</router-link>
          <router-link to="/user">个人中心</router-link>
        </nav>
        <div class="user-info">
          <span v-if="userStore.isLoggedIn">{{ userStore.userInfo?.username }}</span>
          <el-button v-if="!userStore.isLoggedIn" @click="router.push('/login')">登录</el-button>
          <el-button v-else @click="handleLogout">退出</el-button>
        </div>
      </div>
    </header>
    
    <main class="layout-main">
      <router-view />
    </main>
    
    <footer class="layout-footer">
      <div class="container">
        <p>&copy; 2026 智能零食商城 | 基于 AI 图像识别的智能购物平台</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 16px 0;
  
  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    font-size: 20px;
    font-weight: bold;
    color: #409EFF;
  }
  
  .nav {
    display: flex;
    gap: 32px;
    
    a {
      color: #606266;
      text-decoration: none;
      
      &:hover {
        color: #409EFF;
      }
      
      &.router-link-active {
        color: #409EFF;
        font-weight: 500;
      }
    }
  }
}

.layout-main {
  flex: 1;
  background: #f5f7fa;
  padding: 20px 0;
}

.layout-footer {
  background: #303133;
  color: #fff;
  padding: 20px 0;
  text-align: center;
}
</style>
```

---

## 📄 第六步：创建页面组件

### 6.1 优先级排序（按开发建议）

根据文档建议，优先开发以下页面：

| 优先级 | 页面 | 路由 | 说明 |
|-------|------|------|------|
| ⭐⭐⭐⭐⭐ | AI 识别页 | `/recognize` | **核心功能，最优先** |
| ⭐⭐⭐⭐ | 登录页 | `/login` | 认证入口 |
| ⭐⭐⭐⭐ | 商品详情页 | `/products/:id` | 购买入口 |
| ⭐⭐⭐ | 首页 | `/` | 流量入口 |
| ⭐⭐⭐ | 商品列表页 | `/products` | 浏览商品 |
| ⭐⭐⭐ | 订单列表页 | `/orders` | 订单管理 |
| ⭐⭐ | 订单详情页 | `/orders/:id` | 订单信息 |
| ⭐⭐ | 用户中心页 | `/user` | 个人信息 |

### 6.2 AI 识别页（最优先开发）

创建 `src/views/recognize/index.vue`：

```vue
<template>
  <div class="recognize-page">
    <div class="container">
      <h1>AI 智能识别 - 拍照识货</h1>
      
      <el-card class="upload-card">
        <h2>第一步：上传零食图片</h2>
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="false"
          accept="image/jpeg,image/png"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            点击或拖拽上传图片<br>
            <em>支持 JPG/PNG，最大 5MB</em>
          </div>
        </el-upload>
        
        <div v-if="previewUrl" class="preview">
          <img :src="previewUrl" alt="预览图" />
        </div>
        
        <el-button 
          v-if="selectedFile" 
          type="primary" 
          size="large" 
          :loading="loading"
          @click="handleRecognize"
        >
          {{ loading ? '识别中...' : '开始识别' }}
        </el-button>
      </el-card>
      
      <el-card v-if="recognitionResult" class="result-card">
        <h2>识别结果</h2>
        <el-alert type="success" :closable="false">
          <template #title>
            识别成功！共识别到 {{ recognitionResult.detectedCount }} 个目标
          </template>
        </el-alert>
        
        <div class="result-info">
          <p><strong>主要类别：</strong>{{ recognitionResult.categoryName }}</p>
          <p><strong>置信度：</strong>{{ (recognitionResult.detections[0]?.confidence * 100).toFixed(2) }}%</p>
        </div>
        
        <h3>为您推荐以下商品</h3>
        <div class="product-grid">
          <div 
            v-for="product in recognitionResult.products" 
            :key="product.id"
            class="product-card"
            @click="router.push(`/products/${product.id}`)"
          >
            <el-image :src="product.imageUrl" fit="cover">
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <h4>{{ product.name }}</h4>
            <p class="price">¥{{ product.price }}</p>
            <el-button type="primary" size="small">立即购买</el-button>
          </div>
        </div>
        
        <el-button @click="handleReset">重新识别</el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled, Picture } from '@element-plus/icons-vue'
import { recognizeImage } from '@/api/product'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>('')
const loading = ref(false)
const recognitionResult = ref<any>(null)

const handleFileChange = (file: any) => {
  const rawFile = file.raw
  
  // 验证文件类型
  const isImage = rawFile.type === 'image/jpeg' || rawFile.type === 'image/png'
  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG 格式的图片')
    return
  }
  
  // 验证文件大小
  const isLt5M = rawFile.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }
  
  selectedFile.value = rawFile
  previewUrl.value = URL.createObjectURL(rawFile)
}

const handleRecognize = async () => {
  if (!selectedFile.value) return
  
  loading.value = true
  try {
    const result = await recognizeImage(selectedFile.value, userStore.userInfo?.userId)
    recognitionResult.value = result
    ElMessage.success('识别成功！')
  } catch (error) {
    ElMessage.error('识别失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  selectedFile.value = null
  previewUrl.value = ''
  recognitionResult.value = null
}
</script>

<style scoped lang="scss">
.recognize-page {
  min-height: calc(100vh - 160px);
  
  h1 {
    text-align: center;
    margin-bottom: 32px;
    color: #303133;
  }
}

.upload-card {
  margin-bottom: 24px;
  
  h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .upload-demo {
    margin-bottom: 20px;
  }
  
  .preview {
    margin: 20px 0;
    text-align: center;
    
    img {
      max-width: 400px;
      max-height: 400px;
      border-radius: 8px;
    }
  }
}

.result-card {
  h2, h3 {
    font-size: 18px;
    margin-bottom: 16px;
  }
  
  .result-info {
    margin: 20px 0;
    
    p {
      margin: 8px 0;
    }
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.product-card {
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transform: translateY(-4px);
  }
  
  .el-image {
    width: 100%;
    height: 180px;
    border-radius: 4px;
    margin-bottom: 12px;
  }
  
  h4 {
    font-size: 14px;
    margin: 8px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .price {
    color: #F56C6C;
    font-size: 18px;
    font-weight: bold;
    margin: 8px 0;
  }
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 30px;
}
</style>
```

---

## 🧪 第七步：启动开发服务器

### 7.1 确保后端服务已启动

启动顺序（必须按顺序）：

```bash
# 1. 启动 Nacos (8848)
# 2. 启动 MySQL (3306)
# 3. 启动 Redis (6379)
# 4. 启动 Gateway (8080)
# 5. 启动 Product Service (8081)
# 6. 启动 Order Service (8091)
# 7. 启动 User Service (8083)
# 8. 启动 Payment Service (8084)
# 9. 启动 Recognition Service (8086)
```

### 7.2 启动前端开发服务器

```bash
cd d:/Programming/YQSX/shop-web

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

### 7.3 访问应用

```
浏览器访问: http://localhost:5173
```

---

## ✅ 第八步：验证功能

### 8.1 测试登录

```
用户名: admin
密码: 123456
```

### 8.2 测试商品详情

访问: `http://localhost:5173/products/11`

应该看到：
- 商品图片（Unsplash 占位图）
- 商品名称
- 商品价格
- 库存信息
- 立即购买按钮

### 8.3 测试 AI 识别（核心功能）

1. 点击导航栏「AI识别」
2. 上传零食图片（测试图片在 `XML/yolo_recognition_model/test_images/` 目录）
3. 点击「开始识别」
4. 查看识别结果和推荐商品
5. 点击推荐商品跳转到商品详情

---

## 📋 开发建议总结

### ✅ 已实施

1. ✅ 使用 Unsplash 占位图快速启动
2. ✅ 优先开发 AI 识别页（核心功能）
3. ✅ 使用 Element Plus 组件库
4. ✅ 图片加载失败兜底逻辑
5. ✅ 充分测试识别流程

### 📝 待完善

1. ⏳ 创建其他页面组件（登录、首页、商品列表等）
2. ⏳ 实现订单创建流程
3. ⏳ 实现订单支付流程
4. ⏳ 实现用户中心页面
5. ⏳ 响应式布局适配
6. ⏳ 性能优化（懒加载、缓存）

---

## 🎯 后续开发顺序

### Phase 1: 核心页面（1 周）

- [x] AI 识别页
- [ ] 登录页
- [ ] 商品详情页
- [ ] 首页
- [ ] 商品列表页

### Phase 2: 订单功能（3-5 天）

- [ ] 订单创建
- [ ] 订单列表
- [ ] 订单详情
- [ ] 订单支付

### Phase 3: 用户功能（2-3 天）

- [ ] 用户中心
- [ ] 识别历史
- [ ] 个人信息

### Phase 4: 优化完善（3-5 天）

- [ ] 响应式适配
- [ ] 性能优化
- [ ] 错误处理
- [ ] 用户体验优化

---

## 📚 参考文档

- [前端设计方案](./frontend-design-plan.md) - 完整页面设计
- [快速启动指南](./frontend-quickstart.md) - 所有代码示例
- [商品图片方案](./product-images-solution.md) - 图片处理方案
- [前后端对接](./frontend-backend-integration.md) - 接口文档
- [项目状态](./project-status.md) - 当前完成度

---

**文档版本**: v1.0  
**创建时间**: 2026-06-22  
**适用项目**: YQSX 智能零食商城
