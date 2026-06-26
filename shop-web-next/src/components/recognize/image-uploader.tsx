'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImageIcon, X, AlertCircle } from 'lucide-react'
import { DetectionOverlay } from './detection-overlay'
import type { RecognitionResponse } from '@/types'

interface ImageUploaderProps {
  selectedImage: string | null
  isDragging: boolean
  error: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  imageRef: React.RefObject<HTMLImageElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  displayImageSize: { width: number; height: number }
  result: RecognitionResponse | null
  hoveredIndex: number | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUploadClick: () => void
  onClearImage: () => void
  onImageLoad: () => void
  onImageError: () => void
  onHover: (index: number | null) => void
}

export function ImageUploader({
  selectedImage,
  isDragging,
  error,
  fileInputRef,
  imageRef,
  containerRef,
  displayImageSize,
  result,
  hoveredIndex,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onUploadClick,
  onClearImage,
  onImageLoad,
  onImageError,
  onHover
}: ImageUploaderProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={onFileChange}
        className="hidden"
      />

      {selectedImage ? (
        <div ref={containerRef} className="relative inline-block w-full">
          <motion.img
            ref={imageRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            src={selectedImage}
            alt="待识别图片"
            className="w-full rounded-xl object-contain max-h-[480px]"
            onLoad={onImageLoad}
            onError={onImageError}
          />
          {result?.detections && (
            <DetectionOverlay
              detections={result.detections}
              imageDimensions={result.imageDimensions}
              displayImageSize={displayImageSize}
              hoveredIndex={hoveredIndex}
              setHoveredIndex={onHover}
            />
          )}
          <button
            onClick={onClearImage}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-foreground/80 text-background hover:bg-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <motion.div
          onClick={onUploadClick}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`
            relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
            transition-colors duration-300 overflow-hidden
            ${isDragging
              ? 'border-primary bg-primary/10'
              : 'border-primary/30 hover:border-primary/60 hover:bg-primary/5'
            }
          `}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-2">点击或拖拽上传图片</p>
          <p className="text-sm text-muted-foreground">支持 JPG、PNG 格式，也可以直接拍照上传。</p>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedImage && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span>支持拍照上传与本地图片选择</span>
        </div>
      )}
    </>
  )
}
