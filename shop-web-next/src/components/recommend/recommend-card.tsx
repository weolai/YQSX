'use client'

import { motion } from 'framer-motion'
import { Eye, ShoppingCart, Heart, Package, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DinRecommendItem } from '@/types'

interface RecommendCardProps {
  item: DinRecommendItem
  index: number
}

export function RecommendCard({ item, index }: RecommendCardProps) {
  // 推荐指数 (0-100)
  const recommendIndex = Math.round(item.score * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group"
    >
      <Card className="overflow-hidden glass border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
        {/* 商品图片 */}
        <div className="relative aspect-square overflow-hidden bg-secondary/30">
          <img
            src={item.displayImage}
            alt={item.displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* 推荐指数徽章 */}
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm shadow-lg">
              <TrendingUp className="w-3 h-3 mr-1" />
              {recommendIndex}%
            </Badge>
          </div>
          {/* 类目标签 */}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="glass backdrop-blur-sm">
              类目 {item.itemCategory}
            </Badge>
          </div>
        </div>

        {/* 商品信息 */}
        <div className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {item.displayName}
          </h3>

          {/* DIN 得分进度条 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">推荐指数</span>
              <span className="font-medium text-primary">{recommendIndex}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${recommendIndex}%` }}
                transition={{ duration: 0.8, delay: index * 0.08 + 0.3, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>

          {/* 热度统计 */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
            <StatItem icon={<Eye className="w-3 h-3" />} value={item.pvCount} label="浏览" />
            <StatItem icon={<ShoppingCart className="w-3 h-3" />} value={item.cartCount} label="加购" />
            <StatItem icon={<Heart className="w-3 h-3" />} value={item.favCount} label="收藏" />
            <StatItem icon={<Package className="w-3 h-3" />} value={item.buyCount} label="购买" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
      </div>
      <span className="text-xs font-medium text-foreground">{value.toLocaleString()}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
