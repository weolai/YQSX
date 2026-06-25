'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { PixelHero } from '@/components/ui/pixel-hero'
import { Button } from '@/components/ui/button'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/design/scroll-reveal'
import { MagneticButton } from '@/components/design/magnetic-button'
import { LoadingState } from '@/components/async-state/loading-state'
import { EmptyState } from '@/components/async-state/empty-state'
import { RecommendCard } from '@/components/recommend/recommend-card'
import { UserSelector } from '@/components/recommend/user-selector'
import { productApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { DinRecommendItem } from '@/types'

export default function RecommendPage() {
  const { tianchiUserId, ensureTianchiUserId } = useAuthStore()
  const [recommendations, setRecommendations] = useState<DinRecommendItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecommendations = useCallback(async (userId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await productApi.getDinRecommend(userId, 10)
      setRecommendations(result || [])
    } catch (err) {
      console.error('加载推荐失败:', err)
      setError('推荐服务暂时不可用，请稍后再试')
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      // 确保有天池用户ID
      const uid = await ensureTianchiUserId()
      if (uid) {
        await loadRecommendations(uid)
      } else {
        setError('无法分配推荐用户，请检查推荐服务是否正常')
        setIsLoading(false)
      }
    }
    init()
  }, [ensureTianchiUserId, loadRecommendations])

  const handleRefresh = async () => {
    if (!tianchiUserId) return
    setIsRefreshing(true)
    await loadRecommendations(tianchiUserId)
    setIsRefreshing(false)
  }

  const handleUserChange = async (newUserId: number) => {
    await loadRecommendations(newUserId)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero 区 */}
      <PixelHero
        word1="DIN"
        word2="智能推荐"
        description="基于深度兴趣网络（Deep Interest Network），分析用户历史行为，为你精准推荐感兴趣的商品。"
        primaryCta="换一批推荐"
        secondaryCta="了解更多"
        onPrimaryClick={handleRefresh}
        onSecondaryClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
      />

      {/* 推荐内容区 */}
      <main className="container mx-auto px-4 py-12 sm:py-16">
        {/* 用户选择器 */}
        <ScrollReveal className="mb-10 flex justify-center">
          <UserSelector onUserChange={handleUserChange} />
        </ScrollReveal>

        {/* 推荐标题 */}
        <ScrollReveal delay={0.1} className="text-center mb-10">
          <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
            个性化推荐
          </TextShimmer>
          <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-4 tracking-tight">
            为你精选的 {recommendations.length} 款商品
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            基于 DIN 模型对用户历史行为的深度分析，智能匹配你的兴趣偏好
          </p>
        </ScrollReveal>

        {/* 刷新按钮 */}
        <ScrollReveal delay={0.15} className="flex justify-center mb-10">
          <MagneticButton>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20 px-8"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '推荐生成中...' : '换一批推荐'}
            </Button>
          </MagneticButton>
        </ScrollReveal>

        {/* 推荐结果 */}
        {isLoading ? (
          <LoadingState className="flex flex-col items-center justify-center py-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground">DIN 模型正在分析用户兴趣...</p>
            </motion.div>
          </LoadingState>
        ) : error ? (
          <EmptyState
            title="推荐服务暂不可用"
            description={error}
            action={
              <Button onClick={handleRefresh} variant="outline" className="rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20">
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            }
          />
        ) : recommendations.length === 0 ? (
          <EmptyState
            title="暂无推荐结果"
            description="该用户暂无足够的历史行为数据，请尝试切换其他用户"
          />
        ) : (
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {recommendations.map((item, index) => (
              <StaggerItem key={`${item.itemId}-${index}`}>
                <RecommendCard item={item} index={index} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* 底部说明 */}
        {!isLoading && !error && recommendations.length > 0 && (
          <ScrollReveal delay={0.3} className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              推荐结果由 DIN 深度兴趣网络模型生成，基于天池移动推荐数据集训练
            </div>
          </ScrollReveal>
        )}
      </main>
    </div>
  )
}
