'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, RefreshCw, Shuffle, Hash, User } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/design/scroll-reveal'
import { EmptyState } from '@/components/async-state/empty-state'
import { productApi } from '@/lib/api'
import type { RecommendationItem } from '@/types'

export default function RecommendPage() {
  const [userId, setUserId] = useState<number | null>(null)
  const [recommendItems, setRecommendItems] = useState<RecommendationItem[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [recLatency, setRecLatency] = useState<number>(0)
  const [recHitCache, setRecHitCache] = useState<boolean>(false)
  const [recFallback, setRecFallback] = useState<boolean>(false)
  const [recStatus, setRecStatus] = useState<string>('normal')
  const [recReason, setRecReason] = useState<string>('')

  const loadRecommendations = async (uid: number) => {
    try {
      setRecLoading(true)
      const recRes = await productApi.getDinTopK(uid, 40)
      setRecommendItems(recRes.items || [])
      setRecLatency(recRes.latencyMs || 0)
      setRecHitCache(recRes.hitCache || false)
      setRecFallback(false)
      setRecStatus('normal')
      setRecReason(recRes.hitCache ? '命中缓存' : '实时计算')
    } catch (error) {
      console.error('加载 DIN 推荐失败:', error)
      setRecommendItems([])
      setRecFallback(true)
      setRecStatus('fallback')
      setRecReason('推荐服务异常，请稍后重试')
    } finally {
      setRecLoading(false)
    }
  }

  // 从 CSV 数据集中随机抽取一个用户 ID 并加载推荐
  const handleRandomUser = async () => {
    try {
      setRecLoading(true)
      const res = await productApi.getDinRandomUser()
      const randomId = res.data?.userId
      if (!randomId) {
        setRecReason('未抽取到有效用户，请检查 CSV 文件路径')
        setRecLoading(false)
        return
      }
      setUserId(randomId)
      await loadRecommendations(randomId)
    } catch (error) {
      console.error('随机获取用户失败:', error)
      setUserId(null)
      setRecommendItems([])
      setRecFallback(true)
      setRecStatus('fallback')
      setRecReason('读取数据集用户失败，请检查后端文件访问权限')
      setRecLoading(false)
    }
  }

  // 页面首次加载：自动抽取一个随机用户
  useEffect(() => {
    if (userId === null && !recLoading) {
      handleRandomUser()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusText = recLoading
    ? '正在生成推荐...'
    : recStatus === 'blocked'
      ? '推荐服务繁忙，请稍后重试。'
      : recFallback
        ? '推荐服务异常，请稍后重试。'
        : recHitCache
          ? '已为你更新推荐结果（命中缓存）'
          : recommendItems.length > 0
            ? '已为你更新推荐结果（实时计算）'
            : '点击下方按钮从数据集中抽取用户'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <ScrollReveal className="text-center mb-12">
          <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
            智能推荐
          </TextShimmer>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4 tracking-tight">
            DIN 智能推荐
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            系统会从 DIN 预计算缓存用户池中随机抽取一个用户，基于 DIN 模型展示脱敏商品 ID 推荐结果。
          </p>
        </ScrollReveal>

        {/* 当前用户与控制区 */}
        <ScrollReveal delay={0.1} className="max-w-2xl mx-auto mb-10">
          <Card className="p-6 glass border-border/50 rounded-2xl">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="flex-1 flex items-center gap-3 h-12 px-4 rounded-xl bg-background/60 border border-border/60">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">当前数据集用户：</span>
                <span className="font-mono font-semibold text-foreground">
                  {userId ?? '未抽取'}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleRandomUser}
                disabled={recLoading}
                className="h-12 px-4 rounded-xl border-border/60"
                aria-label="换一位数据集用户"
              >
                <Shuffle className="mr-2 h-4 w-4" />
                换一位用户
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => userId && loadRecommendations(userId)}
                disabled={recLoading || userId === null}
                className="h-12 w-12 rounded-xl border-border/60"
                aria-label="刷新推荐"
              >
                <RefreshCw className={`h-4 w-4 ${recLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {recReason && !recLoading && (
              <p className="text-xs text-primary/70 mt-3">{recReason}</p>
            )}
          </Card>
        </ScrollReveal>

        {/* 状态栏 */}
        <ScrollReveal delay={0.2} className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl glass border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">{statusText}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {recLoading ? '加载中' : `共 ${recommendItems.length} 件推荐商品`}
            </div>
          </div>
        </ScrollReveal>

        {/* 纯 ID 推荐列表 */}
        {recLoading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-5 glass border-border/50 rounded-2xl">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : recommendItems.length === 0 ? (
          <EmptyState
            icon={<Hash className="h-10 w-10 text-primary/60" />}
            title="暂未生成推荐"
            description="系统会自动从 DIN 缓存用户池中抽取用户并生成推荐，你也可以点击“换一位用户”手动触发。"
          />
        ) : (
          <StaggerContainer className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recommendItems.map((item, index) => (
              <StaggerItem key={item.itemId}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  className="block cursor-pointer h-full group"
                >
                  <Card className="p-5 h-full glass border-border/50 rounded-2xl hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary" className="text-xs glass">
                        推荐 {index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">score {item.score}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Hash className="h-5 w-5 text-primary/60" />
                      </div>
                      <div>
                        <p className="text-2xl font-mono font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.itemId}
                        </p>
                        <p className="text-xs text-muted-foreground">脱敏商品 ID</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* 技术信息 */}
        {!recLoading && recommendItems.length > 0 && (
          <ScrollReveal delay={0.3} className="mt-10 text-center text-xs text-muted-foreground">
            <p>
              用户 ID：{userId} · 延迟：{recLatency}ms · 模型：DIN · 推荐结果来自 tianchi_mobile_2014 数据集
            </p>
          </ScrollReveal>
        )}
      </main>
    </div>
  )
}
