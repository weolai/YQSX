'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { paymentApi, orderApi } from '@/lib/api'
import type { Order } from '@/types'

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = parseInt(params.orderId as string)

  const [order, setOrder] = useState<Order | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [countdown, setCountdown] = useState(300) // 5分钟倒计时

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const result = await orderApi.getById(orderId)
        const orderData = result.data || result
        setOrder(orderData)

        // 如果订单已支付，直接显示成功
        if (orderData.status === 'PAID' || orderData.status === 'FINISHED') {
          setPaymentStatus('success')
        }
      } catch (error) {
        console.error('加载订单失败:', error)
      }
    }
    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (countdown <= 0 || paymentStatus !== 'idle') return
    const timer = setTimeout(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束，使用 setTimeout 将状态更新推迟到下一次事件循环，避免在 effect 中直接 setState
          setTimeout(() => setPaymentStatus('failed'), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, paymentStatus])

  const handlePay = async () => {
    setIsPaying(true)
    setPaymentStatus('processing')

    try {
      const result = await paymentApi.pay(orderId)
      const paymentData = result.data || result
      
      if (paymentData.code === 200) {
        setPaymentStatus('success')
        setTimeout(() => {
          router.push(`/orders/${orderId}`)
        }, 2000)
      } else {
        setPaymentStatus('failed')
      }
    } catch (error) {
      console.error('支付失败:', error)
      setPaymentStatus('failed')
    } finally {
      setIsPaying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="p-12 backdrop-blur-sm bg-white/80 border-0 shadow-lg text-center">
            {paymentStatus === 'idle' && (
              <>
                <h1 className="text-3xl font-bold mb-8">订单支付</h1>
                
                {order && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg p-6 mb-6">
                      <p className="text-gray-600 mb-2">订单编号: {order.id}</p>
                      <p className="text-gray-600 mb-4">{order.productName} x {order.number}</p>
                      <p className="text-5xl font-bold text-primary">
                        ¥{(order.productPrice * order.number).toFixed(2)}
                      </p>
                    </div>

                    <div className="mb-6">
                      <p className="text-sm text-gray-500 mb-2">剩余支付时间</p>
                      <p className="text-3xl font-bold text-orange-500">{formatTime(countdown)}</p>
                    </div>
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handlePay}
                  disabled={isPaying}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 transition-all duration-300"
                >
                  {isPaying ? '支付中...' : '确认支付'}
                </Button>
              </>
            )}

            {paymentStatus === 'processing' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Loader2 className="h-20 w-20 mx-auto mb-6 animate-spin text-primary" />
                <h2 className="text-2xl font-bold mb-4">支付处理中...</h2>
                <p className="text-gray-600">请稍候，不要关闭页面</p>
              </motion.div>
            )}

            {paymentStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-4">支付成功！</h2>
                <p className="text-gray-600 mb-6">正在跳转到订单详情...</p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/orders/${orderId}`)}
                >
                  立即查看订单
                </Button>
              </motion.div>
            )}

            {paymentStatus === 'failed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-4">支付失败</h2>
                <p className="text-gray-600 mb-6">
                  {countdown === 0 ? '支付超时，请重新下单' : '支付失败，请重试'}
                </p>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/products')}
                    className="flex-1"
                  >
                    返回商品列表
                  </Button>
                  {countdown > 0 && (
                    <Button
                      onClick={() => {
                        setPaymentStatus('idle')
                        setIsPaying(false)
                      }}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500"
                    >
                      重新支付
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
