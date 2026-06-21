// 支付相关类型定义

export interface PaymentRequest {
  orderId: number
}

export interface PaymentResponse {
  code: number
  msg: string
  orderId: number
  orderUpdateResult: string
}
