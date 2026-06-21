'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, Clock, CheckCircle2, XCircle, CreditCard } from 'lucide-react'
import { orderApi } from '@/lib/api'
import type { Order } from '@/types'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = parseInt(params.id as string)

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setIsLoading(true)
        const result = await orderApi.getById(orderId)
        setOrder(result.data || result)
      } catch (error) {
        console.error('加载订单失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadOrder()
  }, [orderId])

  const handlePayment = () => {
    router.push(`/payment/${orderId}`)
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <Card className="p-8">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg mb-4">订单不存在</p>
            <Button onClick={() => router.push('/orders')}>返回订单列表</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>

          <Card className="p-8 backdrop-blur-sm bg-white/80 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">订单详情</h1>
              {getStatusBadge(order.status)}
            </div>

            <div className="space-y-6">
              {/* 订单信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">订单编号</p>
                  <p className="font-semibold">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">用户名</p>
                  <p className="font-semibold">{order.username}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="font-semibold text-lg mb-4">商品信息</h2>
                <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{order.productName}</h3>
                      <p className="text-sm text-gray-600">数量: {order.number}</p>
                    </div>
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold">商品金额</span>
                    <span className="text-2xl font-bold text-primary">
                      ¥{(order.productPrice * order.number).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 支付按钮 */}
              {order.status === 'WAIT_PAY' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Button
                    size="lg"
                    onClick={handlePayment}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 transition-all duration-300"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    立即支付
                  </Button>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
