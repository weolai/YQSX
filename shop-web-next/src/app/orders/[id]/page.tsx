'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, CreditCard, User, Hash } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal } from '@/components/design/scroll-reveal'
import { MagneticButton } from '@/components/design/magnetic-button'
import { LoadingState } from '@/components/async-state/loading-state'
import { ErrorState } from '@/components/async-state/error-state'
import { EmptyState } from '@/components/async-state/empty-state'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { orderApi } from '@/lib/api'
import { OrderStatus, type Order } from '@/types'

const statusMessage: Record<OrderStatus, { title: string; desc: string }> = {
  [OrderStatus.WAIT_PAY]: {
    title: '订单待支付',
    desc: '请在规定时间内完成支付，超时后订单可能自动取消。',
  },
  [OrderStatus.PAID]: {
    title: '订单已支付',
    desc: '支付已确认，商家正在准备处理订单。',
  },
  [OrderStatus.FINISHED]: {
    title: '订单已完成',
    desc: '感谢你的购买，期待再次为你推荐喜欢的零食。',
  },
  [OrderStatus.CANCELED]: {
    title: '订单已取消',
    desc: '该订单已取消，如有疑问请联系平台客服。',
  },
  [OrderStatus.DUPLICATE]: {
    title: '订单待支付',
    desc: '该订单已存在，请继续完成支付。',
  },
  [OrderStatus.BLOCKED]: {
    title: '订单处理中',
    desc: '订单正在处理中，请稍后查看状态。',
  },
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = parseInt(params.id as string)

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 加载订单（带 AbortController 防 Race Condition）
  useEffect(() => {
    const controller = new AbortController()
    console.log('[order-detail] 开始加载订单详情', { orderId })
    const loadOrder = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        const result = await orderApi.getById(orderId)
        if (controller.signal.aborted) {
          console.log('[order-detail] 加载订单详情请求已取消', { orderId })
          return
        }
        console.log('[order-detail] 订单详情加载成功', {
          orderId: result.id,
          status: result.status,
          productName: result.productName,
          productPrice: result.productPrice,
          number: result.number,
          totalAmount: result.productPrice * result.number,
        })
        setOrder(result)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[order-detail] 加载订单详情失败:', error)
          setLoadError('订单加载失败，请刷新后重试。')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }
    loadOrder()
    return () => controller.abort()
  }, [orderId])

  // 监听订单状态变化，输出支付按钮等关键 UI 状态
  useEffect(() => {
    if (!order) return
    const showPayButton = order.status === OrderStatus.WAIT_PAY
    console.log('[order-detail] 订单状态变化', {
      orderId: order.id,
      status: order.status,
      showPayButton,
      paymentLink: showPayButton ? `/payment/${order.id}` : null,
    })
  }, [order])

  const handlePayment = useCallback(() => {
    console.log('[order-detail] 用户点击支付按钮，跳转支付页', { orderId })
    router.push(`/payment/${orderId}`)
  }, [router, orderId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 sm:py-16">
          <LoadingState className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-24 mb-8 rounded-full" />
            <Card className="p-8 glass border-border/50 rounded-2xl">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            </Card>
          </LoadingState>
        </main>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 sm:py-16">
          <ErrorState message={loadError} onRetry={() => window.location.reload()} />
        </main>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 sm:py-16">
          <EmptyState
            icon={<Package className="h-10 w-10 text-primary/60" />}
            title="订单不存在或已被删除。"
            action={
              <Button
                onClick={() => router.push('/orders')}
                className="bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              >
                返回订单列表
              </Button>
            }
          />
        </main>
      </div>
    )
  }

  const totalAmount = order.productPrice * order.number
  const message = statusMessage[order.status] || { title: '订单详情', desc: '' }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-8 rounded-full hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <Card className="p-8 glass border-border/50 rounded-2xl shadow-lg shadow-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50">
                <div>
                  <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-2" as="span">
                    订单详情
                  </TextShimmer>
                  <h1 className="text-4xl md:text-5xl font-serif font-semibold text-foreground tracking-tight">
                    {message.title}
                  </h1>
                </div>
                <OrderStatusBadge status={order.status} className="self-start sm:self-auto text-sm px-3 py-1" />
              </div>

              <div className="space-y-6">
                {/* 状态提示 */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                  <p className="text-muted-foreground">{message.desc}</p>
                </div>

                {/* 订单信息 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">订单编号</p>
                      <p className="font-semibold text-foreground">#{order.id}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">下单用户</p>
                      <p className="font-semibold text-foreground">{order.username}</p>
                    </div>
                  </div>
                </div>

                {/* 商品信息 */}
                <div className="pt-2">
                  <h2 className="font-semibold text-lg mb-4 text-foreground">商品信息</h2>
                  <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/10">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-2 text-foreground line-clamp-2">{order.productName}</h3>
                        <p className="text-sm text-muted-foreground">数量：{order.number} 件</p>
                        <p className="text-sm text-muted-foreground">单价：¥{order.productPrice.toFixed(2)}</p>
                      </div>
                      <div className="w-20 h-20 bg-background rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Package className="h-10 w-10 text-primary/40" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="font-medium text-foreground">订单金额</span>
                      <span className="text-3xl font-serif font-semibold text-primary">
                        ¥{totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 支付按钮 */}
                {order.status === OrderStatus.WAIT_PAY && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <MagneticButton
                      onClick={handlePayment}
                      className="w-full h-14 text-lg font-semibold bg-white text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground shadow-lg shadow-black/10 tracking-wide"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      立即支付
                    </MagneticButton>
                  </motion.div>
                )}
              </div>
            </Card>
          </ScrollReveal>
        </div>
      </main>
    </div>
  )
}
