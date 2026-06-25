'use client'

import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Camera, ScanLine, Sparkles } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal } from '@/components/design/scroll-reveal'
import { ImageUploader } from '@/components/recognize/image-uploader'
import { RecognitionResultPanel } from '@/components/recognize/result-panel'
import { useRecognition } from '@/hooks/use-recognition'
import { useAuthStore } from '@/lib/stores/auth'
import { productApi } from '@/lib/api'

export default function RecognizePage() {
  const { userInfo } = useAuthStore()
  const [recommendList, setRecommendList] = useState<number[]>([])
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendError, setRecommendError] = useState<string | null>(null)
  const {
    selectedImage,
    displayImageSize,
    isLoading,
    result,
    error,
    hoveredIndex,
    isDragging,
    fileInputRef,
    imageRef,
    containerRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    handleUploadClick,
    handleImageLoad,
    clearImage,
    setHoveredIndex,
  } = useRecognition()

  useEffect(() => {
    let cancelled = false

    const loadRecommendations = async () => {
      if (!userInfo?.userId) {
        setRecommendList([])
        return
      }

      setRecommendLoading(true)
      setRecommendError(null)
      try {
        const response = await productApi.getDinRecommendations(userInfo.userId, 40)
        if (!cancelled) {
          setRecommendList(response.data?.recommendList ?? [])
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendError(error instanceof Error ? error.message : '推荐服务暂时不可用')
          setRecommendList([])
        }
      } finally {
        if (!cancelled) {
          setRecommendLoading(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      cancelled = true
    }
  }, [userInfo?.userId])

  const recommendPreview = useMemo(() => recommendList.slice(0, 10), [recommendList])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <ScrollReveal className="text-center mb-12">
          <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
            AI 智能识别
          </TextShimmer>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4 tracking-tight">
            拍照识别零食
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            上传一张照片，AI  instantly 识别图中的零食，并为你推荐相似美味
          </p>
        </ScrollReveal>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-8">
          {/* 左侧：上传区 */}
          <ScrollReveal delay={0.1} className="lg:col-span-2">
            <Card className="p-6 h-full glass border-border/50 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Camera className="mr-2 h-5 w-5 text-primary" />
                上传照片
              </h2>

              <ImageUploader
                selectedImage={selectedImage}
                isDragging={isDragging}
                fileInputRef={fileInputRef}
                imageRef={imageRef}
                containerRef={containerRef}
                displayImageSize={displayImageSize}
                result={result}
                hoveredIndex={hoveredIndex}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileChange={handleFileChange}
                onUploadClick={handleUploadClick}
                onClearImage={clearImage}
                onImageLoad={handleImageLoad}
                onHover={setHoveredIndex}
              />
            </Card>
          </ScrollReveal>

          {/* 右侧：结果区 */}
          <ScrollReveal delay={0.2} className="lg:col-span-3">
            <Card className="p-6 h-full min-h-[420px] glass border-border/50 rounded-2xl">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <ScanLine className="mr-2 h-5 w-5 text-primary" />
                识别结果
              </h2>

              <RecognitionResultPanel
                isLoading={isLoading}
                error={error}
                result={result}
                onUploadClick={handleUploadClick}
              />
            </Card>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.3} className="mt-8">
          <Card className="p-6 glass border-border/50 rounded-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <Sparkles className="mr-2 h-5 w-5 text-primary" />
                  DIN 推荐商品 ID
                </h2>
                <p className="text-sm text-muted-foreground mt-1">基于当前登录用户的历史行为生成 Top40 纯数字商品 ID。</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {recommendLoading ? '加载中' : `${recommendList.length} 条推荐`}
              </div>
            </div>

            {recommendError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {recommendError}
              </div>
            ) : recommendPreview.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {recommendPreview.map((itemId, index) => (
                  <div
                    key={`${itemId}-${index}`}
                    className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    <span className="font-mono text-sm font-medium tracking-wide">{itemId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-6 py-10 text-center text-sm text-muted-foreground">
                当前暂无推荐数据，请先完成登录并确保算法服务可访问。
              </div>
            )}
          </Card>
        </ScrollReveal>
      </main>
    </div>
  )
}
