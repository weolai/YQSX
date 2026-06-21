'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, Upload, Loader2, Package, ArrowRight } from 'lucide-react'
import { productApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import { getCategoryByYoloClassId } from '@/lib/utils/category-mapping'
import type { RecognitionResponse } from '@/types'

export default function RecognizePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { userInfo } = useAuthStore()

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResponse | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 显示预览
    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // 开始识别
    setIsRecognizing(true)
    setRecognitionResult(null)

    try {
      const result = await productApi.recognize(file, userInfo?.userId)
      setRecognitionResult(result.data || result)
    } catch (error) {
      console.error('识别失败:', error)
      alert('识别失败，请重试')
    } finally {
      setIsRecognizing(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleProductClick = (productId: number) => {
    router.push(`/products/${productId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-center mb-8">
            <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
              智能拍照识别
            </span>
          </h1>
          <p className="text-center text-gray-600 mb-12 text-lg">
            上传零食图片，AI 将为您识别商品并推荐购买
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* 左侧：上传区域 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="p-8 backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">上传图片</h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!selectedImage ? (
                <div
                  onClick={handleUploadClick}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-all duration-300"
                >
                  <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-2">点击上传图片</p>
                  <p className="text-sm text-gray-400">支持 JPG、PNG 格式</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={selectedImage}
                      alt="Selected"
                      fill
                      unoptimized
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleUploadClick}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    重新上传
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>

          {/* 右侧：识别结果 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="p-8 backdrop-blur-sm bg-white/80 border-0 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">识别结果</h2>

              {isRecognizing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                  <p className="text-center text-gray-600">AI 正在识别中...</p>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ) : recognitionResult ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">检测到</span>
                      <Badge className="bg-gradient-to-r from-pink-500 to-orange-500">
                        {recognitionResult.detectedCount} 个商品
                      </Badge>
                    </div>
                    {recognitionResult.detections.map((detection, idx) => {
                      const category = getCategoryByYoloClassId(detection.productClassId)
                      const displayName = category?.displayName || detection.productClassName
                      return (
                        <div key={idx} className="mb-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{displayName}</span>
                            <span className="text-sm text-gray-500">
                              {(detection.confidence * 100).toFixed(1)}% 置信度
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 flex items-center">
                      <Package className="mr-2 h-5 w-5 text-primary" />
                      推荐商品
                    </h3>
                    <div className="space-y-3">
                      {recognitionResult.products.map((product) => (
                        <motion.div
                          key={product.id}
                          whileHover={{ x: 4 }}
                          onClick={() => handleProductClick(product.id)}
                          className="flex items-center space-x-4 p-4 rounded-lg border hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{product.name}</h4>
                            <p className="text-sm text-gray-500">库存: {product.stock}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">¥{product.price}</p>
                            <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Camera className="h-16 w-16 mb-4" />
                  <p>上传图片后，AI 将自动识别</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
