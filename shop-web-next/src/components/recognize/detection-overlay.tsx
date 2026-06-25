'use client'

import { motion } from 'framer-motion'
import { getCategoryByYoloClassId } from '@/lib/utils/category-mapping'
import type { Detection, ImageDimensions, BoundingBox } from '@/types'

function getBoxStyle(
  bbox: BoundingBox,
  originalSize: ImageDimensions | undefined,
  displaySize: { width: number; height: number }
) {
  const originalWidth = originalSize?.width || displaySize.width
  const originalHeight = originalSize?.height || displaySize.height

  if (!originalWidth || !originalHeight || !displaySize.width) {
    return {}
  }

  const scaleX = displaySize.width / originalWidth
  const scaleY = displaySize.height / originalHeight

  return {
    left: `${bbox.x1 * scaleX}px`,
    top: `${bbox.y1 * scaleY}px`,
    width: `${(bbox.x2 - bbox.x1) * scaleX}px`,
    height: `${(bbox.y2 - bbox.y1) * scaleY}px`
  }
}

interface DetectionOverlayProps {
  detections: Detection[]
  imageDimensions?: ImageDimensions
  displayImageSize: { width: number; height: number }
  hoveredIndex: number | null
  setHoveredIndex: (index: number | null) => void
}

export function DetectionOverlay({
  detections,
  imageDimensions,
  displayImageSize,
  hoveredIndex,
  setHoveredIndex
}: DetectionOverlayProps) {
  return (
    <>
      {detections.map((detection, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="absolute border-2 border-primary rounded-sm cursor-pointer hover:border-destructive hover:bg-destructive/5 transition-colors"
          style={getBoxStyle(
            detection.boundingBox,
            imageDimensions,
            displayImageSize
          )}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div
            className={`
              absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5
              rounded text-[11px] font-medium whitespace-nowrap shadow-md
              transition-colors
              ${hoveredIndex === index ? 'bg-destructive' : 'bg-primary'}
              text-primary-foreground
            `}
          >
            <span>
              {getCategoryByYoloClassId(detection.productClassId)?.displayName ||
                detection.productClassName}
            </span>
            <span className="opacity-90">
              {(detection.confidence * 100).toFixed(1)}%
            </span>
            <span
              className={`
                absolute -bottom-1 left-3 w-0 h-0
                border-l-4 border-r-4 border-t-4
                border-l-transparent border-r-transparent
                ${hoveredIndex === index ? 'border-t-destructive' : 'border-t-primary'}
              `}
            />
          </div>
        </motion.div>
      ))}
    </>
  )
}
