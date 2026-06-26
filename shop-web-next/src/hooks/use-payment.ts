import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { paymentApi, orderApi } from '@/lib/api'
import { OrderStatus, type Order } from '@/types'

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed'

export function usePayment(orderId: number) {
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [countdown, setCountdown] = useState(300) // 5分钟倒计时
  const [loadError, setLoadError] = useState<string | null>(null)

  // 防重复提交锁：useRef 立即生效，避免 setState 异步延迟
  const payingRef = useRef(false)
  // 支付成功跳转定时器
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 倒计时到期标记，避免在 effect 中同步 setState 触发 cascading renders
  const expiredRef = useRef(false)

  // 加载订单（带 AbortController 防 Race Condition）
  useEffect(() => {
    const controller = new AbortController()
    console.log('[use-payment] 开始加载订单', { orderId })
    const loadOrder = async () => {
      try {
        const result = await orderApi.getById(orderId)
        if (controller.signal.aborted) {
          console.log('[use-payment] 加载订单请求已取消', { orderId })
          return
        }
        const orderData = result
        console.log('[use-payment] 订单加载成功', {
          orderId: orderData.id,
          status: orderData.status,
          productName: orderData.productName,
          productPrice: orderData.productPrice,
          number: orderData.number,
          totalAmount: orderData.productPrice * orderData.number,
        })
        setOrder(orderData)
        // 如果订单已支付，直接显示成功
        if (orderData.status === OrderStatus.PAID || orderData.status === OrderStatus.FINISHED) {
          console.log('[use-payment] 订单已处于支付完成状态，跳过倒计时', {
            orderId: orderData.id,
            status: orderData.status,
          })
          setPaymentStatus('success')
        } else {
          console.log('[use-payment] 订单未支付，启动支付倒计时', {
            orderId: orderData.id,
            status: orderData.status,
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[use-payment] 加载订单失败:', error)
          setLoadError('订单加载失败，请刷新后重试。')
        }
      }
    }
    loadOrder()
    return () => controller.abort()
  }, [orderId])

  // 倒计时（纯函数 setState，副作用在 useEffect 中处理）
  useEffect(() => {
    if (paymentStatus !== 'idle') return
    if (countdown <= 0) {
      // 倒计时到期：使用 setTimeout 异步设置状态，避免 cascading renders
      if (!expiredRef.current) {
        expiredRef.current = true
        console.warn('[use-payment] 支付倒计时已到期，标记支付失败', { orderId })
        const t = setTimeout(() => setPaymentStatus('failed'), 0)
        return () => clearTimeout(t)
      }
      return
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, paymentStatus, orderId])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const handlePay = useCallback(async () => {
    // 防重复提交：useRef 立即生效
    if (payingRef.current) {
      console.warn('[use-payment] 支付按钮重复点击，已忽略', { orderId })
      return
    }
    payingRef.current = true
    console.log('[use-payment] 开始支付', { orderId, currentPaymentStatus: paymentStatus })
    setPaymentStatus('processing')

    try {
      const result = await paymentApi.pay(orderId)
      const paymentData = result
      console.log('[use-payment] 支付接口响应', {
        orderId,
        code: paymentData.code,
        msg: paymentData.msg,
        orderUpdateResult: paymentData.orderUpdateResult,
      })

      if (paymentData.code === 200) {
        console.log('[use-payment] 支付成功，2秒后跳转订单详情', { orderId })
        setPaymentStatus('success')
        // 2秒后跳转，保存 timer ref 供卸载时清理
        redirectTimerRef.current = setTimeout(() => {
          console.log('[use-payment] 支付成功跳转订单详情', { orderId })
          router.push(`/orders/${orderId}`)
        }, 2000)
      } else {
        console.warn('[use-payment] 支付接口返回非成功状态', {
          orderId,
          code: paymentData.code,
          msg: paymentData.msg,
        })
        setPaymentStatus('failed')
      }
    } catch (error) {
      console.error('[use-payment] 支付过程异常:', error)
      setPaymentStatus('failed')
    } finally {
      // 注意：不重置 payingRef，防止支付中再次点击
      // 仅在支付失败后重置，允许重试
      if (paymentStatus === 'failed' || paymentStatus === 'idle') {
        payingRef.current = false
        console.log('[use-payment] 支付流程结束，重置防重复锁', { orderId })
      }
    }
  }, [orderId, router, paymentStatus])

  const handleRetry = useCallback(() => {
    console.log('[use-payment] 用户点击重试，重置支付状态', { orderId })
    payingRef.current = false
    setPaymentStatus('idle')
  }, [orderId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const totalAmount = order ? order.productPrice * order.number : 0

  return {
    order,
    paymentStatus,
    countdown,
    loadError,
    totalAmount,
    handlePay,
    handleRetry,
    formatTime,
  }
}
