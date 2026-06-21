'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, ShoppingCart, Star } from 'lucide-react'
import { productApi, orderApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { Product } from '@/types'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = parseInt(params.id as string)
  const { userInfo } = useAuthStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOrdering, setIsOrdering] = useState(false)

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setIsLoading(true)
        const result = await productApi.getById(productId)
        setProduct(result.data || result)
      } catch (error) {
        console.error('加载商品失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProduct()
  }, [productId])

  const handleBuyNow = async () => {
    if (!userInfo || !product) return

    setIsOrdering(true)
    try {
      const orderResult = await orderApi.create(product.id, userInfo.userId)
      const orderData = orderResult.data || orderResult

      // 后端直接返回 Order 对象；兼容 code/orderId 包装格式
      const orderId = orderData.orderId || (orderData as unknown as { id?: number }).id
      if (orderId) {
        router.push(`/orders/${orderId}`)
      } else {
        alert(orderData.msg || '创建订单失败')
      }
    } catch (error) {
      console.error('创建订单失败:', error)
      alert('创建订单失败，请重试')
    } finally {
      setIsOrdering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <div className="grid md:grid-cols-2 gap-12">
              <Skeleton className="w-full aspect-square" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg mb-4">商品不存在</p>
            <Button onClick={() => router.push('/products')}>返回商品列表</Button>
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
          className="max-w-5xl mx-auto"
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>

          <div className="grid md:grid-cols-2 gap-12">
            {/* 左侧：商品图片 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="p-8 backdrop-blur-sm bg-white/80 border-0 shadow-lg">
                <div className="aspect-square bg-gradient-to-br from-pink-100 to-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="h-32 w-32 text-gray-400" />
                </div>
              </Card>
            </motion.div>

            {/* 右侧：商品信息 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
                <div className="flex items-center space-x-4 mb-4">
                  <Badge className="bg-gradient-to-r from-pink-500 to-orange-500">
                    {product.categoryName || '零食'}
                  </Badge>
                  <div className="flex items-center text-yellow-500">
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5 fill-current" />
                    <Star className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <Card className="p-6 bg-gradient-to-r from-pink-50 to-orange-50 border-0">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-5xl font-bold text-primary">¥{product.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>库存: {product.stock} 件</span>
                  <span>已售: {product.sales} 件</span>
                </div>
              </Card>

              <div>
                <h2 className="font-semibold text-lg mb-3">商品介绍</h2>
                <p className="text-gray-600 leading-relaxed">
                  {product.name} 是一款优质零食，精选原料，口感醇厚。
                  无论是自己享用还是分享给朋友，都是绝佳的选择。
                </p>
              </div>

              <div className="flex space-x-4">
                <Button
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={isOrdering || product.stock === 0}
                  className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 transition-all duration-300"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isOrdering ? '创建订单中...' : product.stock === 0 ? '已售罄' : '立即购买'}
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
