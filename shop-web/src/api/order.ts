import request from '@/utils/request'
import type { Order, OrderCreateResponse } from './types/order'

// 创建订单（注意：使用application/x-www-form-urlencoded）
export const createOrder = (pid: number, uid: number) => {
  const params = new URLSearchParams()
  params.append('pid', pid.toString())
  params.append('uid', uid.toString())
  
  return request.post<OrderCreateResponse>('/orders/save', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
}

// 查询订单详情
export const getOrderById = (id: number) => {
  return request.get<Order>(`/orders/${id}`)
}

// 更新订单状态
export const updateOrderStatus = (orderId: number, status: string) => {
  const params = new URLSearchParams()
  params.append('orderId', orderId.toString())
  params.append('status', status)
  
  return request.post('/orders/updateStatus', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
}
