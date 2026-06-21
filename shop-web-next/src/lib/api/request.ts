import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

// 创建axios实例
// 使用相对路径 /api，让 Next.js rewrites 代理到 Gateway，避免浏览器跨域
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：注入Token
request.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error: AxiosError) => {
    const status = error.response?.status
    
    if (typeof window !== 'undefined') {
      switch (status) {
        case 401:
          console.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          window.location.href = '/login'
          break
        case 429:
          console.error('请求过于频繁，请稍后再试')
          break
        case 503:
          console.error('服务暂时不可用，请稍后再试')
          break
        default:
          const data = error.response?.data as { msg?: string; message?: string } | undefined
          const errorMsg = data?.msg || data?.message || '请求失败'
          console.error(errorMsg)
      }
    }
    
    return Promise.reject(error)
  }
)

export default request
