import request from '@/utils/request'
import type { PaymentResponse } from './types/payment'

// 订单支付（注意：使用application/x-www-form-urlencoded）
export const payOrder = (orderId: number) => {
  const params = new URLSearchParams()
  params.append('orderId', orderId.toString())
  
  return request.post<PaymentResponse>('/payment/pay', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
}
