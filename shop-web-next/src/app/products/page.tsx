'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, Package } from 'lucide-react'
import { productApi } from '@/lib/api'
import type { Product } from '@/types'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // 从接口返回的商品数据中提取真实分类，保证与后端同步
  const categoryTags = Array.from(new Set(products.map(p => p.categoryName).filter((name): name is string => Boolean(name))))

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true)
        const result = await productApi.getList()
        const allProducts = result.data || result || []
        setProducts(allProducts)
      } catch (error) {
        console.error('加载商品失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  const handleProductClick = (id: number) => {
    router.push(`/products/${id}`)
  }

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.categoryName === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
              商品列表
            </span>
          </h1>
          <p className="text-center text-gray-600 mb-12 text-lg">
            精选 {products.length} 款美味零食
          </p>
        </motion.div>

        {/* 分类筛选 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8 flex flex-wrap gap-3 justify-center"
        >
          <Badge
            className={`cursor-pointer px-4 py-2 text-sm ${
              selectedCategory === 'all' 
                ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedCategory('all')}
          >
            全部
          </Badge>
          {categoryTags.map((category) => (
            <Badge
              key={category}
              className={`cursor-pointer px-4 py-2 text-sm ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </motion.div>

        {/* 商品网格 */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="w-full aspect-square mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">暂无商品</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                whileHover={{ y: -8 }}
                onClick={() => handleProductClick(product.id)}
                className="cursor-pointer"
              >
                <Card className="p-6 h-full backdrop-blur-sm bg-white/80 border-0 shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="aspect-square bg-gradient-to-br from-pink-100 to-orange-100 rounded-lg mb-4 flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-primary">¥{product.price}</span>
                    <Badge variant="secondary" className="text-xs">
                      库存 {product.stock}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">销量: {product.sales}</p>
                  <Button 
                    className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProductClick(product.id)
                    }}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    查看详情
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
