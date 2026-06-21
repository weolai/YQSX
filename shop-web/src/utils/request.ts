import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/global'

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：注入Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response.data
  },
  (error: AxiosError) => {
    const status = error.response?.status
    
    switch (status) {
      case 401:
        ElMessage.error('登录已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        window.location.href = '/login'
        break
      case 429:
        ElMessage.error('请求过于频繁，请稍后再试')
        break
      case 503:
        ElMessage.error('服务暂时不可用，请稍后再试')
        break
      default:
        const errorMsg = (error.response?.data as any)?.msg || 
                        (error.response?.data as any)?.message || 
                        '请求失败'
        ElMessage.error(errorMsg)
    }
    
    return Promise.reject(error)
  }
)

export default request
