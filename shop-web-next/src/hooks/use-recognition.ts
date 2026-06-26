import { useState, useRef, useEffect } from 'react'
import { productApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { RecognitionResponse } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

function getFileValidationError(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return '仅支持 JPG、PNG 格式的图片'
  }
  if (file.size > MAX_FILE_SIZE) {
    return '图片大小不能超过 10MB'
  }
  return null
}

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
    const validationError = getFileValidationError(file)
    if (validationError) {
      // 释放上一个 Blob URL，防止内存泄漏
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage)
      }
      setSelectedImage(null)
      setDisplayImageSize({ width: 0, height: 0 })
      setResult(null)
      setHoveredIndex(null)
      setIsLoading(false)
      setError(validationError)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
      if (data.status === 'error') {
        setError(data.message || '识别失败，请更换图片后重试')
      } else {
        setResult(data)
      }
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
    const files = e.dataTransfer.files
    if (files.length === 0) return
    if (files.length > 1) {
      setError('暂不支持同时上传多张图片，已仅处理第一张')
    }
    const file = files[0]
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

  const handleImageError = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage)
    }
    setSelectedImage(null)
    setDisplayImageSize({ width: 0, height: 0 })
    setResult(null)
    setHoveredIndex(null)
    setError('图片加载失败，请重新上传')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
    handleImageError,
    clearImage,
    setHoveredIndex,
  }
}
