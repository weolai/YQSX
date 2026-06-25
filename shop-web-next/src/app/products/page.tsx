'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, Package, ArrowRight } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/design/scroll-reveal'
import { MagneticButton } from '@/components/design/magnetic-button'
import { LoadingState } from '@/components/async-state/loading-state'
import { EmptyState } from '@/components/async-state/empty-state'
import { productApi } from '@/lib/api'
import type { Product } from '@/types'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const [recommendUserId, setRecommendUserId] = useState<number | null>(null)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [recLoading, setRecLoading] = useState(true)
  const [recLatency, setRecLatency] = useState<number>(0)
  const [recHitCache, setRecHitCache] = useState<boolean>(false)
  const [recFallback, setRecFallback] = useState<boolean>(false)
  const [recStatus, setRecStatus] = useState<string>('normal')
  const [recReason, setRecReason] = useState<string>('')

  const categoryTags = Array.from(new Set(products.map(p => p.categoryName).filter((name): name is string => Boolean(name))))

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true)
        const result = await productApi.getList()
        const allProducts = result || []
        setProducts(allProducts)
      } catch (error) {
        console.error('加载商品失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  // 推荐加载逻辑抽成独立函数，支持"换一批"局部刷新
  const loadRecommendations = async () => {
    try {
      setRecLoading(true)
      // 从缓存中抽样一个真实用户，避免随机 userId 导致缓存 miss
      const sampleRes = await productApi.getCachedUserSample(1, true)
      const sampledUserId = sampleRes.userIds[0]
      if (!sampledUserId) {
        setRecLoading(false)
        return
      }
      setRecommendUserId(sampledUserId)

      const recRes = await productApi.getDinTopKFromBackend(sampledUserId, 8)
      setRecommendations(recRes.products || [])
      setRecLatency(recRes.latencyMs || 0)
      setRecHitCache(recRes.hitCache || false)
      setRecFallback(recRes.fallback || false)
      setRecStatus(recRes.status || 'normal')
      setRecReason(recRes.reason || '')
    } catch (error) {
      console.error('加载推荐失败:', error)
    } finally {
      setRecLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  const handleProductClick = (id: number) => {
    router.push(`/products/${id}`)
  }

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.categoryName === selectedCategory)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        {/* 个性化推荐区域 */}
        <ScrollReveal className="mb-12">
          <div className="rounded-2xl glass border border-border/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">为您推荐</h2>
                <p className="text-sm text-muted-foreground">
                  {recLoading
                    ? '正在加载推荐结果...'
                    : recStatus === 'blocked'
                      ? `推荐请求被限流，请稍后再试`
                      : recStatus === 'fallback'
                        ? `基于用户 ${recommendUserId} · 已降级为热销商品 · ${recLatency}ms`
                        : `基于用户 ${recommendUserId} 的个性化推荐 · ${recHitCache ? '命中缓存' : '实时计算'} · ${recLatency}ms`}
                </p>
                {recReason && !recLoading && (
                  <p className="text-xs text-primary/70 mt-1">{recReason}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRecommendations()}
                disabled={recLoading}
                className="rounded-full"
              >
                {recLoading ? '加载中...' : '换一批'}
              </Button>
            </div>
            {recLoading ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-40 rounded-xl flex-shrink-0" />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <EmptyState title="暂无推荐" icon={<Package className="h-8 w-8 text-primary/60" />} />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recommendations.map((product, index) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -4 }}
                    onClick={() => handleProductClick(product.id)}
                    className="min-w-[160px] max-w-[160px] cursor-pointer"
                  >
                    <Card className="p-4 h-full glass border-border/50 rounded-xl hover:shadow-lg transition-all">
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        <Package className="h-8 w-8 text-primary/40" />
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover rounded-lg"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">ID: {product.id}</p>
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        {product.name || `推荐商品 #${product.id}`}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          排名 {index + 1}
                        </Badge>
                        <span className="text-xs text-primary font-medium">
                          ¥{product.price}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal className="text-center mb-12">
          <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
            精选好物
          </TextShimmer>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4 tracking-tight">
            发现美味零食
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            精选 {products.length} 款美味零食，每一口都是惊喜
          </p>
        </ScrollReveal>

        {/* 分类筛选 */}
        <ScrollReveal delay={0.1} className="mb-10">
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className={selectedCategory === 'all'
                ? 'rounded-full bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground'
                : 'rounded-full glass hover:bg-white/50 hover:text-foreground hover:border-foreground/20'
              }
            >
              全部
            </Button>
            {categoryTags.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category
                  ? 'rounded-full bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground'
                  : 'rounded-full glass hover:bg-white/50 hover:text-foreground hover:border-foreground/20'
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </ScrollReveal>

        {/* 商品网格 */}
        {isLoading ? (
          <LoadingState className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-5 glass border-border/50 rounded-2xl">
                <Skeleton className="w-full aspect-square mb-4 rounded-xl" />
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </LoadingState>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package className="h-10 w-10 text-primary/60" />}
            title="暂无商品"
            action={
              <Button
                onClick={() => router.push('/recognize')}
                className="bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              >
                去拍照识别
              </Button>
            }
          />
        ) : (
          <StaggerContainer className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <StaggerItem key={product.id}>
                <motion.div
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProductClick(product.id)}
                  className="cursor-pointer h-full group"
                >
                  <Card className="p-5 h-full glass border-border/50 rounded-2xl hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl mb-5 flex items-center justify-center relative overflow-hidden">
                      <Package className="h-16 w-16 text-primary/40 group-hover:scale-110 group-hover:text-primary/60 transition-all duration-300" />
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <h3 className="font-semibold mb-3 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-primary">¥{product.price}</span>
                      <Badge variant="secondary" className="text-xs glass">
                        库存 {product.stock}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">销量: {product.sales}</p>
                    <MagneticButton
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProductClick(product.id)
                      }}
                      className="w-full h-10 text-sm font-medium bg-white text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground shadow-sm"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      查看详情
                      <ArrowRight className="ml-1 h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </MagneticButton>
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
