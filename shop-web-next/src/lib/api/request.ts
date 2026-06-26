import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios'

// 创建axios实例
// 使用相对路径 /api，让 Next.js rewrites 代理到 Gateway，避免浏览器跨域
const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：注入Token
instance.interceptors.request.use(
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
instance.interceptors.response.use(
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
          // 同步清除 cookie，避免中间件误判已登录
          document.cookie = 'token=; path=/; max-age=0; SameSite=Strict'
          // 使用 router 而非 window.location.href 避免整页刷新丢失状态
          // 但 401 拦截器无法访问 router，此处仍用 location.href
          // 多个并发 401 通过去重锁避免重复跳转
          if (!window.__redirectingToLogin) {
            window.__redirectingToLogin = true
            window.location.href = '/login'
          }
          break
        case 403:
          console.error('无权限访问该资源')
          break
        case 429:
          console.error('请求过于频繁，请稍后再试')
          break
        case 503:
          console.error('服务暂时不可用，请稍后再试')
          break
        default:
          if (!error.response) {
            console.error('无法连接到服务网关，请确认 Gateway 已启动')
            break
          }
          const data = error.response?.data as { msg?: string; message?: string } | undefined
          // 优先使用后端返回的业务错误信息；缺失时打印 status+url 便于定位（如代理返回 HTML）
          const reqUrl = error.config?.url ?? ''
          const fallbackMsg = `请求失败 [${status}] ${reqUrl}`.trim()
          const errorMsg = data?.msg || data?.message || fallbackMsg
          console.error(errorMsg)
      }
    }

    return Promise.reject(error)
  }
)

// 由于响应拦截器返回 response.data，包装方法使返回类型为 Promise<T>
// 这样调用方 request.get<T>() 直接得到 T，无需再取 .data
const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.get(url, config) as unknown as Promise<T>,
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.post(url, data, config) as unknown as Promise<T>,
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.put(url, data, config) as unknown as Promise<T>,
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.delete(url, config) as unknown as Promise<T>,
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.patch(url, data, config) as unknown as Promise<T>,
}

export default request
