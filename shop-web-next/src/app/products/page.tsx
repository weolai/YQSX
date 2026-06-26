'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, Package } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/design/scroll-reveal'
import { LoadingState } from '@/components/async-state/loading-state'
import { EmptyState } from '@/components/async-state/empty-state'
import { productApi } from '@/lib/api'
import type { Product } from '@/types'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

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

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.categoryName === selectedCategory)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <ScrollReveal className="text-center mb-12">
          <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
            精选好物
          </TextShimmer>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4 tracking-tight">
            发现美味零食
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            精选多款零食商品，适合休闲、办公、追剧和日常分享。
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
                <Link href={`/products/${product.id}`} passHref legacyBehavior>
                  <motion.a
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    className="block cursor-pointer h-full group"
                  >
                    <Card className="p-5 h-full glass border-border/50 rounded-2xl hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl mb-5 flex items-center justify-center relative overflow-hidden">
                        <Package className="h-16 w-16 text-primary/40 group-hover:scale-110 group-hover:text-primary/60 transition-all duration-300" />
                        {product.imageUrl && (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
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
                      <p className="text-sm text-muted-foreground mb-4">已售 {product.sales}</p>
                      <Button
                        variant="outline"
                        className="w-full h-10 text-sm font-medium bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground shadow-sm"
                        asChild
                      >
                        <span className="flex items-center justify-center">
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          查看详情
                        </span>
                      </Button>
                    </Card>
                  </motion.a>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </main>
    </div>
  )
}
