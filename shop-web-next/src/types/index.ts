// API响应类型
export interface ApiResponse<T = unknown> {
  code: number
  message?: string
  msg?: string
  data: T
  timestamp?: number
}

// 用户相关
export interface LoginResponse {
  code: number
  msg: string
  token: string
  userId: number
  username: string
}

export interface RegisterResponse {
  code: number
  msg: string
  token?: string
  userId?: number
  username?: string
}

export interface ResetPasswordResponse {
  code: number
  msg: string
}

export interface SendCodeResponse {
  code: number
  msg: string
  verifyCode?: string
}

export interface UserInfo {
  userId: number
  username: string
  token?: string
}

// 商品相关
export interface Product {
  id: number
  name: string
  price: number
  stock: number
  categoryId: number
  imageUrl: string
  sales: number
  categoryName?: string
}

export interface RecommendationItem {
  itemId: number
  score: number
  rank: number
  reason: string
}

export interface RecommendationResponse {
  code: number
  msg: string
  data: {
    recommendList: number[]
  }
}

export interface DinTopKData {
  userId: number
  items: RecommendationItem[]
  modelVersion: string
  dataVersion: string
  year: number
  hitCache: boolean
  latencyMs: number
}

export interface DinTopKResponse {
  code: number
  msg: string
  data: DinTopKData
}

/**
 * SpringBoot Product 服务 /products/din/topk 响应
 * 后端已聚合商品详情、缓存状态、耗时、版本、降级标记
 */
export interface DinTopKBackendResponse {
  userId: number
  products: Product[]
  hitCache: boolean
  latencyMs: number
  modelVersion: string
  dataVersion: string
  year: number
  fallback: boolean
  /** 推荐状态：normal=正常推荐, fallback=后端降级, blocked=Sentinel限流 */
  status: string
  /** 推荐理由摘要 */
  reason: string
}

export interface CachedUserSampleResponse {
  userIds: number[]
  modelVersion: string
  dataVersion: string
  year: number
  onlyCached: boolean
}

export interface DinRandomUserResponse {
  code: number
  msg: string
  data: {
    userId: number
    source: string
  }
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

export interface ImageDimensions {
  width: number
  height: number
}

export interface RecognitionResponse {
  status: string
  message: string
  requestId: string
  detections: Detection[]
  detectedCount: number
  products: Product[]
  categoryName?: string
  imageDimensions?: ImageDimensions
}

// 订单相关
export enum OrderStatus {
  WAIT_PAY = 'WAIT_PAY',
  PAID = 'PAID',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
  DUPLICATE = 'DUPLICATE',
  BLOCKED = 'BLOCKED',
}

export interface Order {
  id: number
  pid: number
  uid: number
  username: string
  productName: string
  productPrice: number
  number: number
  status: OrderStatus
  version: number
}

// 支付相关
export interface PaymentResponse {
  code: number
  msg: string
  orderId: number
  orderUpdateResult: string
}
