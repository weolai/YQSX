'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { X, Sparkles, ScanLine, Package, ShoppingBag, ArrowRight } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/design/scroll-reveal'
import { MagneticButton } from '@/components/design/magnetic-button'
import { getCategoryByYoloClassId } from '@/lib/utils/category-mapping'
import type { RecognitionResponse } from '@/types'

interface RecognitionResultPanelProps {
  isLoading: boolean
  error: string | null
  result: RecognitionResponse | null
  onUploadClick: () => void
}

export function RecognitionResultPanel({
  isLoading,
  error,
  result,
  onUploadClick
}: RecognitionResultPanelProps) {
  const router = useRouter()

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </motion.div>
      ) : error ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium mb-2">识别失败</p>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">{error}</p>
          <Button
            onClick={onUploadClick}
            variant="outline"
            className="rounded-full glass"
          >
            重新上传
          </Button>
        </motion.div>
      ) : result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* 检测目标 */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                <Sparkles className="mr-1.5 h-4 w-4 text-accent" />
                检测到的零食
              </h3>
              <Badge className="bg-primary text-white border-0">
                {result.detectedCount} 个目标
              </Badge>
            </div>
            {result.detections.length === 0 ? (
              <p className="text-sm text-muted-foreground">未检测到零食，请尝试上传更清晰的图片</p>
            ) : (
              <StaggerContainer className="space-y-3">
                {result.detections.map((detection, index) => {
                  const category = getCategoryByYoloClassId(detection.productClassId)
                  const displayName = category?.displayName || detection.productClassName
                  return (
                    <StaggerItem key={index}>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">{displayName}</span>
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {(detection.confidence * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${detection.confidence * 100}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          />
                        </div>
                      </div>
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            )}
          </div>

          {/* 推荐商品 */}
          {result.products && result.products.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-between">
                <span className="flex items-center">
                  <ShoppingBag className="mr-1.5 h-4 w-4 text-primary" />
                  为你推荐
                </span>
                <span className="text-xs text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
                  共 {result.products.length} 件
                </span>
              </h3>
              <StaggerContainer className="space-y-3">
                {result.products.map((product) => (
                  <StaggerItem key={product.id}>
                    <motion.div
                      whileHover={{ x: 4, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => router.push(`/products/${product.id}`)}
                      className="flex items-center p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 mr-4 relative overflow-hidden">
                        <Package className="h-6 w-6 text-primary" />
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">库存: {product.stock}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-lg font-bold text-primary">¥{product.price}</p>
                        <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <div className="mt-6 text-center">
                <MagneticButton
                  onClick={() => router.push('/products')}
                  className="h-11 px-6 bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                >
                  浏览全部商品
                </MagneticButton>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground"
        >
          <div className="w-20 h-20 mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ScanLine className="h-10 w-10 text-primary/50" />
          </div>
          <p>上传图片后，识别结果将显示在这里</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
