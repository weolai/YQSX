<template>
  <div class="home-page">
    <header class="home-header">
      <div class="header-content">
        <h1 class="logo gradient-text">YQSX</h1>
        <nav class="nav-menu">
          <router-link to="/" class="nav-item active">首页</router-link>
          <router-link to="/recognize" class="nav-item">拍照识别</router-link>
          <router-link to="/products" class="nav-item">商品列表</router-link>
          <router-link to="/orders" class="nav-item">我的订单</router-link>
        </nav>
        <div class="user-info">
          <el-dropdown trigger="click" @command="handleCommand">
            <span class="user-dropdown">
              <span class="user-avatar">{{ authStore.username?.charAt(0).toUpperCase() }}</span>
              <span class="user-name">{{ authStore.username }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  <span>个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><ShoppingBag /></el-icon>
                  <span>我的订单</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <main class="home-main">
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title fade-in">智能零食商城</h1>
          <p class="hero-subtitle fade-in">AI拍照识别 · 智能推荐 · 一键下单</p>
          <div class="hero-actions fade-in">
            <el-button type="primary" size="large" @click="goToRecognize">
              <el-icon class="mr-2"><Camera /></el-icon>
              开始识别
            </el-button>
            <el-button size="large" @click="goToProducts">
              浏览商品
            </el-button>
          </div>
        </div>
      </section>

      <section class="features-section">
        <h2 class="section-title">核心功能</h2>
        <div class="features-grid">
          <div class="feature-card glass-card card-hover" @click="goToRecognize">
            <div class="feature-icon">📷</div>
            <h3 class="feature-title">拍照识别</h3>
            <p class="feature-desc">上传零食图片，AI自动识别商品类别</p>
          </div>
          
          <div class="feature-card glass-card card-hover" @click="goToProducts">
            <div class="feature-icon">🛒</div>
            <h3 class="feature-title">智能推荐</h3>
            <p class="feature-desc">基于识别结果，推荐相关商品</p>
          </div>
          
          <div class="feature-card glass-card card-hover">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">快速下单</h3>
            <p class="feature-desc">一键创建订单，在线支付</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <p>&copy; 2026 YQSX智能零食商城. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Camera, ArrowDown, User, ShoppingBag, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const goToRecognize = () => {
  router.push('/recognize')
}

const goToProducts = () => {
  router.push('/products')
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/user/profile')
      break
    case 'orders':
      router.push('/orders')
      break
    case 'logout':
      ElMessage.success('退出成功')
      authStore.logout()
      router.push('/login')
      break
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/variables.scss';

.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

// Header
.home-header {
  background: white;
  box-shadow: $shadow-sm;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: $spacing-2 $spacing-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: $font-size-2xl;
  font-weight: bold;
  cursor: pointer;
}

.nav-menu {
  display: flex;
  gap: $spacing-3;
}

.nav-item {
  color: $text-secondary;
  text-decoration: none;
  font-size: $font-size-base;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-base;
  transition: all $duration-base $easing-ease-in-out;

  &:hover {
    color: $primary-color;
    background: $bg-tertiary;
  }

  &.active {
    color: $primary-color;
    font-weight: 600;
  }
}

.user-info {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: $spacing-1;
  cursor: pointer;
  padding: $spacing-1 $spacing-2;
  border-radius: $radius-base;
  transition: all $duration-base $easing-ease-in-out;

  &:hover {
    background: $bg-tertiary;
  }
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $primary-gradient;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  color: $text-primary;
  font-weight: 500;
  font-size: $font-size-sm;
}

.dropdown-icon {
  color: $text-secondary;
  font-size: 12px;
  transition: transform $duration-base $easing-ease-in-out;
}

.user-dropdown:hover .dropdown-icon {
  transform: translateY(2px);
}

// Main content
.home-main {
  flex: 1;
  padding: $spacing-5 $spacing-3;
}

// Hero section
.hero-section {
  max-width: 1200px;
  margin: 0 auto $spacing-6;
  padding: $spacing-6 0;
  text-align: center;
}

.hero-content {
  animation: fadeIn $duration-slow $easing-ease-out;
}

.hero-title {
  font-size: $font-size-4xl;
  font-weight: bold;
  background: $primary-gradient;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: $spacing-2;
  animation-delay: 0.1s;
}

.hero-subtitle {
  font-size: $font-size-xl;
  color: $text-secondary;
  margin-bottom: $spacing-4;
  animation-delay: 0.2s;
}

.hero-actions {
  display: flex;
  gap: $spacing-2;
  justify-content: center;
  animation-delay: 0.3s;

  .el-button {
    padding: $spacing-2 $spacing-4;
    font-size: $font-size-lg;
    border-radius: $radius-base;
    
    &.el-button--primary {
      background: $primary-gradient;
      border: none;
    }
  }
}

.mr-2 {
  margin-right: 8px;
}

// Features section
.features-section {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: $font-size-3xl;
  font-weight: bold;
  color: $text-primary;
  margin-bottom: $spacing-4;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $spacing-3;
  margin-top: $spacing-4;
}

.feature-card {
  padding: $spacing-4;
  text-align: center;
  cursor: pointer;
  transition: all $duration-base $easing-ease-in-out;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: $spacing-2;
}

.feature-title {
  font-size: $font-size-xl;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-1;
}

.feature-desc {
  color: $text-secondary;
  font-size: $font-size-sm;
  line-height: 1.6;
}

// Footer
.home-footer {
  background: $bg-dark;
  color: white;
  text-align: center;
  padding: $spacing-3;
  margin-top: auto;
}
</style>
