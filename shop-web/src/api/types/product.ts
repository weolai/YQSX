// 商品相关类型定义

export interface Product {
  id: number
  name: string
  price: number
  stock: number
  categoryId: number
  imageUrl: string
  sales: number
  categoryName?: string
  createTime?: string
  updateTime?: string
}

export interface BoundingBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Detection {
  productClassId: number
  productClassName: string
  confidence: number
  boundingBox: BoundingBox
}

export interface RecognitionResponse {
  status: string
  message: string
  requestId: string
  detections: Detection[]
  detectedCount: number
  products: Product[]
  categoryName?: string
}

export interface ProductQuery {
  categoryId?: number
  limit?: number
  keyword?: string
}
