'use client'

import { Navbar } from '@/components/layout/navbar'
import { Card } from '@/components/ui/card'
import { Camera, ScanLine } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { ScrollReveal } from '@/components/design/scroll-reveal'
import { ImageUploader } from '@/components/recognize/image-uploader'
import { RecognitionResultPanel } from '@/components/recognize/result-panel'
import { useRecognition } from '@/hooks/use-recognition'

export default function RecognizePage() {
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
    handleImageError,
    clearImage,
    setHoveredIndex,
  } = useRecognition()

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
            上传零食照片，系统将识别图中商品，并推荐相似零食。识别结果可能受图片清晰度、拍摄角度和光线影响，请以商品详情为准。
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
                error={error}
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
                onImageError={handleImageError}
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
      </main>
    </div>
  )
}
