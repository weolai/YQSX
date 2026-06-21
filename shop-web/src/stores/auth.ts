import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi } from '@/api/auth'
import type { UserInfo } from '@/api/types/auth'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(
    JSON.parse(localStorage.getItem('userInfo') || 'null')
  )

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const userId = computed(() => userInfo.value?.userId || 0)
  const username = computed(() => userInfo.value?.username || '')

  // Actions
  const login = async (username: string, password: string) => {
    try {
      const res = await loginApi(username, password)
      
      if (res.code === 200) {
        token.value = res.token
        userInfo.value = {
          userId: res.userId,
          username: res.username,
          token: res.token
        }
        
        // 持久化存储
        localStorage.setItem('token', token.value)
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        ElMessage.success('登录成功')
        return true
      } else {
        ElMessage.error(res.msg || '登录失败')
        return false
      }
    } catch (error) {
      ElMessage.error('登录失败，请稍后重试')
      return false
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    ElMessage.success('已退出登录')
  }

  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userId,
    username,
    login,
    logout,
    setUserInfo
  }
})
