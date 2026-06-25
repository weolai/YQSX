import request from './request'
import type { LoginResponse, RegisterResponse, ResetPasswordResponse, SendCodeResponse, UserInfo, Product, RecognitionResponse, Order, OrderCreateResponse, PaymentResponse, DinRecommendItem } from '@/types'

// 认证接口
export const authApi = {
  // 登录（使用请求体传递用户名和密码）
  login: (username: string, password: string) => {
    return request.post<LoginResponse>('/user/login', { username, password })
  },
  
  // 获取当前用户
  getCurrentUser: () => {
    return request.get<UserInfo>('/user/current')
  },

  // 发送短信验证码
  sendCode: (phone: string, type: 'REGISTER' | 'RESET_PASSWORD') => {
    return request.post<SendCodeResponse>('/user/send-code', { phone, type })
  },

  // 手机号验证码注册
  register: (data: { phone: string; code: string; username: string; password: string; nickname?: string }) => {
    return request.post<RegisterResponse>('/user/register', data)
  },

  // 手机号验证码重置密码
  resetPassword: (data: { phone: string; code: string; newPassword: string }) => {
    return request.post<ResetPasswordResponse>('/user/reset-password', data)
  }
}

// 商品接口
export const productApi = {
  // 商品详情
  getById: (id: number) => {
    return request.get<Product>(`/products/${id}`)
  },
  
  // 推荐商品
  getRecommend: (categoryId?: number, limit: number = 10) => {
    return request.get<Product[]>('/products/recommend', {
      params: { categoryId, limit }
    })
  },

  // 商品列表
  getList: (categoryId?: number) => {
    return request.get<Product[]>('/products/list', {
      params: categoryId ? { categoryId } : undefined
    })
  },
  
  // 拍照识别
  recognize: (file: File, uid?: number) => {
    const formData = new FormData()
    formData.append('file', file)
    if (uid) {
      formData.append('uid', uid.toString())
    }

    return request.post<RecognitionResponse>('/products/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    })
  },

  // DIN 个性化推荐
  getDinRecommend: (userId: number, topK: number = 10) => {
    return request.get<DinRecommendItem[]>('/products/recommend/din', {
      params: { userId, topK }
    })
  },

  // 获取样本用户列表
  getSampleUsers: () => {
    return request.get<number[]>('/products/recommend/users')
  }
}

// 订单接口
export const orderApi = {
  // 创建订单
  create: (pid: number, uid: number) => {
    return request.post<OrderCreateResponse>('/orders/save', { pid, uid })
  },
  
  // 查询订单
  getById: (id: number) => {
    return request.get<Order>(`/orders/${id}`)
  },

  // 查询用户订单列表
  getListByUid: (uid: number) => {
    return request.get<Order[]>(`/orders/list/${uid}`)
  }
}

// 支付接口
export const paymentApi = {
  // 订单支付
  pay: (orderId: number) => {
    const params = new URLSearchParams()
    params.append('orderId', orderId.toString())
    
    return request.post<PaymentResponse>('/payment/pay', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
  }
}
