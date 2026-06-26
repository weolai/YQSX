'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, ChevronRight, ShoppingBag, Wallet } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/design/scroll-reveal'
import { MagneticButton } from '@/components/design/magnetic-button'
import { LoadingState } from '@/components/async-state/loading-state'
import { EmptyState } from '@/components/async-state/empty-state'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { orderApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { OrderStatus, type Order } from '@/types'

const statusFilters = [
  { key: 'all', label: '全部' },
  { key: OrderStatus.WAIT_PAY, label: '待支付' },
  { key: OrderStatus.PAID, label: '已支付' },
  { key: OrderStatus.FINISHED, label: '已完成' },
  { key: OrderStatus.CANCELED, label: '已取消' },
]

function getOrderAmount(order: Order) {
  return order.productPrice * order.number
}

function getOrderQuantity(order: Order) {
  return order.number
}

const statusBorderClass: Record<OrderStatus, string> = {
  [OrderStatus.WAIT_PAY]: 'border-l-accent',
  [OrderStatus.PAID]: 'border-l-green-500',
  [OrderStatus.FINISHED]: 'border-l-blue-500',
  [OrderStatus.CANCELED]: 'border-l-destructive',
  [OrderStatus.DUPLICATE]: 'border-l-accent',
  [OrderStatus.BLOCKED]: 'border-l-orange-500',
}

export default function OrdersPage() {
  const router = useRouter()
  const { userInfo } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!userInfo) return
    const controller = new AbortController()
    abortRef.current = controller

    const loadOrders = async () => {
      try {
        setIsLoading(true)
        const result = await orderApi.getListByUid(userInfo.userId)
        if (!controller.signal.aborted) {
          const orderList = result || []
          setOrders(orderList)
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return
        console.error('加载订单失败:', error)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    loadOrders()

    return () => {
      controller.abort()
    }
  }, [userInfo])

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter(order => order.status === activeFilter)

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 sm:py-16">
          <EmptyState
            icon={<Wallet className="h-10 w-10 text-primary/60" />}
            title="登录后查看订单"
            action={
              <Button
                onClick={() => router.push('/login')}
                className="bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              >
                去登录
              </Button>
            }
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <ScrollReveal className="text-center mb-10">
          <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
            订单中心
          </TextShimmer>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4 tracking-tight">
            我的订单
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            共 {orders.length} 笔订单，可随时查看购买记录与支付状态。
          </p>
        </ScrollReveal>

        {/* 状态筛选 */}
        <ScrollReveal delay={0.1} className="mb-10">
          <div className="flex flex-wrap gap-3 justify-center">
            {statusFilters.map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.key)}
                className={activeFilter === filter.key
                  ? 'rounded-full bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground'
                  : 'rounded-full glass hover:bg-white/50 hover:text-foreground hover:border-foreground/20'
                }
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </ScrollReveal>

        {/* 订单列表 */}
        {isLoading ? (
          <LoadingState rows={3} className="max-w-3xl mx-auto" />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<Package className="h-10 w-10 text-primary/60" />}
            title={activeFilter === 'all' ? '暂无订单' : '当前状态下暂无订单。'}
            action={
              <Button
                onClick={() => router.push('/products')}
                className="bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                去购物
              </Button>
            }
          />
        ) : (
          <StaggerContainer className="space-y-4 max-w-3xl mx-auto">
            {filteredOrders.map((order) => (
              <StaggerItem key={order.id}>
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  className="cursor-pointer group"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <Card
                    className={`
                      p-6 glass border-border/50 rounded-2xl border-l-4
                      hover:shadow-lg hover:shadow-primary/5 transition-all duration-300
                      ${statusBorderClass[order.status] || 'border-l-muted'}
                    `}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">订单编号</p>
                        <p className="font-semibold text-foreground">#{order.id}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/50">
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{order.productName}</p>
                        <p className="text-sm text-muted-foreground">数量：{getOrderQuantity(order)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-serif font-semibold text-primary">
                          ¥{getOrderAmount(order).toFixed(2)}
                        </span>
                        <MagneticButton
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/orders/${order.id}`)
                          }}
                          className="h-9 px-4 text-sm bg-white text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground shadow-sm"
                        >
                          查看详情
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </MagneticButton>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </main>
    </div>
  )
}
