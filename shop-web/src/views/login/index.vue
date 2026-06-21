<template>
  <div class="login-page">
    <div class="login-container glass-card">
      <div class="login-header">
        <h1 class="login-title gradient-text">YQSX智能零食商城</h1>
        <p class="login-subtitle">AI识别 · 智能推荐 · 轻松购物</p>
      </div>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        class="login-form"
        size="large"
      >
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tips">
        <p>测试账号：admin / 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const formData = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    const success = await authStore.login(formData.username, formData.password)
    
    if (success) {
      router.push('/')
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/variables.scss';

.login-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: $spacing-3;
}

.login-container {
  width: 100%;
  max-width: 420px;
  padding: $spacing-5;
  animation: scaleIn $duration-base $easing-ease-out;
}

.login-header {
  text-align: center;
  margin-bottom: $spacing-4;
}

.login-title {
  font-size: $font-size-3xl;
  font-weight: bold;
  margin-bottom: $spacing-2;
}

.login-subtitle {
  color: $text-secondary;
  font-size: $font-size-sm;
}

.login-form {
  margin-top: $spacing-4;

  :deep(.el-input__wrapper) {
    border-radius: $radius-base;
    box-shadow: $shadow-sm;
    transition: all $duration-base $easing-ease-in-out;

    &:hover {
      box-shadow: $shadow-md;
    }
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: $font-size-lg;
  font-weight: 600;
  border-radius: $radius-base;
  background: $primary-gradient;
  border: none;
  transition: all $duration-base $easing-ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
  }

  &:active {
    transform: scale(0.98);
  }
}

.login-tips {
  text-align: center;
  margin-top: $spacing-3;
  
  p {
    color: $text-tertiary;
    font-size: $font-size-sm;
  }
}
</style>
