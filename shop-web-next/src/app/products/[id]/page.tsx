'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, ShoppingCart, Star, Sparkles } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal } from '@/components/design/scroll-reveal'
import { MagneticButton } from '@/components/design/magnetic-button'
import { LoadingState } from '@/components/async-state/loading-state'
import { ErrorState } from '@/components/async-state/error-state'
import { EmptyState } from '@/components/async-state/empty-state'
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isOrdering, setIsOrdering] = useState(false)
  // 防重复下单锁：useRef 立即生效，避免 setState 异步延迟导致重复提交
  const orderingRef = useRef(false)

  // 加载商品（带 AbortController 防 Race Condition）
  useEffect(() => {
    const controller = new AbortController()
    const loadProduct = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        const result = await productApi.getById(productId)
        if (controller.signal.aborted) return
        setProduct(result)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('加载商品失败:', error)
          setLoadError('加载商品失败，请刷新重试')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }
    loadProduct()
    return () => controller.abort()
  }, [productId])

  const handleBuyNow = useCallback(async () => {
    if (!userInfo || !product) return
    // 防重复提交：useRef 立即生效
    if (orderingRef.current) return
    orderingRef.current = true
    setIsOrdering(true)
    try {
      const orderResult = await orderApi.create(product.id, userInfo.userId)
      const orderData = orderResult

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
      orderingRef.current = false
    }
  }, [userInfo, product, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 sm:py-16">
          <LoadingState className="max-w-5xl mx-auto">
            <Skeleton className="h-10 w-24 mb-8 rounded-full" />
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6 glass border-border/50 rounded-2xl">
                <Skeleton className="w-full aspect-square rounded-xl" />
              </Card>
              <div className="space-y-5">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            </div>
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

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 sm:py-16">
          <EmptyState
            icon={<Package className="h-10 w-10 text-primary/60" />}
            title="商品不存在"
            action={
              <Button
                onClick={() => router.push('/products')}
                className="bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              >
                返回商品列表
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
        <div className="max-w-5xl mx-auto">
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

          <div className="grid md:grid-cols-2 gap-8">
            {/* 左侧：商品图片 */}
            <ScrollReveal delay={0.1}>
              <Card className="p-6 glass border-border/50 rounded-2xl shadow-lg shadow-primary/5">
                <div className="aspect-square bg-gradient-to-br from-primary/10 via-secondary/50 to-accent/10 rounded-xl flex items-center justify-center relative overflow-hidden">
                  <motion.div
                    animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                  >
                    <Package className="h-32 w-32 text-primary/40" />
                  </motion.div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary text-white border-0">
                      <Sparkles className="mr-1 h-3 w-3" />
                      {product.categoryName || '零食'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </ScrollReveal>

            {/* 右侧：商品信息 */}
            <ScrollReveal delay={0.2} className="space-y-6">
              <div>
                <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-3" as="span">
                  商品详情
                </TextShimmer>
                <h1 className="text-3xl md:text-4xl font-serif font-semibold mb-4 text-foreground">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-1 text-accent">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                  <Star className="h-5 w-5 text-muted-foreground/40" />
                  <span className="ml-2 text-sm text-muted-foreground">4.8 分</span>
                </div>
              </div>

              <Card className="p-6 glass border-border/50 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-baseline space-x-2 mb-3">
                  <span className="text-sm text-muted-foreground">售价</span>
                  <span className="text-5xl font-serif font-semibold text-primary">¥{product.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>库存: {product.stock} 件</span>
                  <span>已售: {product.sales} 件</span>
                </div>
              </Card>

              <div>
                <h2 className="font-semibold text-lg mb-3 text-foreground">商品介绍</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {product.name} 是一款优质零食，精选原料，口感醇厚。
                  无论是自己享用还是分享给朋友，都是绝佳的选择。
                </p>
              </div>

              <MagneticButton
                onClick={handleBuyNow}
                disabled={isOrdering || product.stock === 0}
                className="w-full h-14 text-lg font-semibold bg-white text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground shadow-lg shadow-black/10"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {isOrdering ? '创建订单中...' : product.stock === 0 ? '已售罄' : '立即购买'}
              </MagneticButton>

              {!userInfo && (
                <p className="text-sm text-muted-foreground text-center">
                  登录后可立即购买，<Button variant="link" className="h-auto p-0 text-primary" onClick={() => router.push('/login')}>去登录</Button>
                </p>
              )}
            </ScrollReveal>
          </div>
        </div>
      </main>
    </div>
  )
}
