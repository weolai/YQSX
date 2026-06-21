import request from './request'
import type { LoginResponse, UserInfo, Product, RecognitionResponse, Order, OrderCreateResponse, PaymentResponse } from '@/types'

// 认证接口
export const authApi = {
  // 登录（使用请求体传递用户名和密码）
  login: (username: string, password: string) => {
    return request.post<LoginResponse>('/user/login', { username, password })
  },
  
  // 获取当前用户
  getCurrentUser: () => {
    return request.get<UserInfo>('/user/current')
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
