// 订单相关类型定义

export interface Order {
  id: number
  pid: number
  uid: number
  username: string
  productName: string
  productPrice: number
  number: number
  status: string
  version: number
  createTime?: string
  updateTime?: string
}

export interface OrderCreateRequest {
  pid: number
  uid: number
}

export interface OrderCreateResponse {
  code: number
  msg: string
  orderId: number
}

export interface OrderStatusUpdateRequest {
  orderId: number
  status: string
}
