'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Package, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { orderApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { Order } from '@/types'

export default function OrdersPage() {
  const router = useRouter()
  const { userInfo } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userInfo) return
    const loadOrders = async () => {
      try {
        setIsLoading(true)
        const result = await orderApi.getListByUid(userInfo.userId)
        const orderList = result.data || result || []
        setOrders(orderList)
      } catch (error) {
        console.error('加载订单失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadOrders()
  }, [userInfo])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAIT_PAY':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />待支付</Badge>
      case 'PAID':
        return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />已支付</Badge>
      case 'FINISHED':
        return <Badge className="bg-blue-500"><CheckCircle2 className="mr-1 h-3 w-3" />已完成</Badge>
      case 'CANCELED':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />已取消</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
              我的订单
            </span>
          </h1>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg mb-4">暂无订单</p>
            <Button onClick={() => router.push('/products')}>去购物</Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">订单编号</p>
                      <p className="font-semibold">{order.id}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.productName}</p>
                      <p className="text-sm text-gray-500">数量: {order.number}</p>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      ¥{(order.productPrice * order.number).toFixed(2)}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
