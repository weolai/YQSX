import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { paymentApi, orderApi } from '@/lib/api'
import type { Order } from '@/types'

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
    const loadOrder = async () => {
      try {
        const result = await orderApi.getById(orderId)
        if (controller.signal.aborted) return
        const orderData = result
        setOrder(orderData)
        // 如果订单已支付，直接显示成功
        if (orderData.status === 'PAID' || orderData.status === 'FINISHED') {
          setPaymentStatus('success')
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('加载订单失败:', error)
          setLoadError('加载订单失败，请刷新重试')
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
        const t = setTimeout(() => setPaymentStatus('failed'), 0)
        return () => clearTimeout(t)
      }
      return
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown, paymentStatus])

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
    if (payingRef.current) return
    payingRef.current = true
    setPaymentStatus('processing')

    try {
      const result = await paymentApi.pay(orderId)
      const paymentData = result

      if (paymentData.code === 200) {
        setPaymentStatus('success')
        // 2秒后跳转，保存 timer ref 供卸载时清理
        redirectTimerRef.current = setTimeout(() => {
          router.push(`/orders/${orderId}`)
        }, 2000)
      } else {
        setPaymentStatus('failed')
      }
    } catch (error) {
      console.error('支付失败:', error)
      setPaymentStatus('failed')
    } finally {
      // 注意：不重置 payingRef，防止支付中再次点击
      // 仅在支付失败后重置，允许重试
      if (paymentStatus === 'failed' || paymentStatus === 'idle') {
        payingRef.current = false
      }
    }
  }, [orderId, router, paymentStatus])

  const handleRetry = useCallback(() => {
    payingRef.current = false
    setPaymentStatus('idle')
  }, [])

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
