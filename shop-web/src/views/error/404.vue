<template>
  <div class="error-page">
    <div class="error-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">页面不存在</h2>
      <p class="error-desc">抱歉，您访问的页面不存在</p>
      <el-button type="primary" @click="goBack">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/variables.scss';

.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-secondary;
}

.error-content {
  text-align: center;
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  background: $primary-gradient;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: $spacing-2;
}

.error-title {
  font-size: $font-size-3xl;
  color: $text-primary;
  margin-bottom: $spacing-2;
}

.error-desc {
  font-size: $font-size-lg;
  color: $text-secondary;
  margin-bottom: $spacing-4;
}
</style>
