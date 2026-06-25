import { useState, useRef, useEffect } from 'react'
import { productApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { RecognitionResponse } from '@/types'

export function useRecognition() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { userInfo } = useAuthStore()

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [displayImageSize, setDisplayImageSize] = useState({ width: 0, height: 0 })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RecognitionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 组件卸载时释放 Blob URL，防止内存泄漏
  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage)
      }
    }
  }, [selectedImage])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }

    // 释放上一个 Blob URL，防止内存泄漏
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage)
    }
    setSelectedImage(URL.createObjectURL(file))
    setDisplayImageSize({ width: 0, height: 0 })
    setIsLoading(true)
    setError(null)
    setResult(null)
    setHoveredIndex(null)

    try {
      const response = await productApi.recognize(file, userInfo?.userId)
      const data = response
      setResult(data)
    } catch (err) {
      console.error('识别失败:', err)
      setError(err instanceof Error ? err.message : '识别服务暂时不可用，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processImage(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageLoad = () => {
    if (imageRef.current) {
      setDisplayImageSize({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight
      })
    }
  }

  const clearImage = () => {
    // 释放 Blob URL，防止内存泄漏
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage)
    }
    setSelectedImage(null)
    setResult(null)
    setError(null)
    setDisplayImageSize({ width: 0, height: 0 })
    setHoveredIndex(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return {
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
    processImage,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    handleUploadClick,
    handleImageLoad,
    clearImage,
    setHoveredIndex,
  }
}
