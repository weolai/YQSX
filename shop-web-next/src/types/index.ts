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
export interface Order {
  id: number
  pid: number
  uid: number
  username: string
  productName: string
  productPrice: number
  number: number
  status: string
  version: number
}

export interface OrderCreateResponse {
  code: number
  msg: string
  orderId: number
}

// 支付相关
export interface PaymentResponse {
  code: number
  msg: string
  orderId: number
  orderUpdateResult: string
}

// DIN 推荐相关
export interface DinRecommendItem {
  itemId: number
  itemCategory: number
  displayName: string
  displayImage: string
  score: number
  pvCount: number
  cartCount: number
  favCount: number
  buyCount: number
  popularityScore: number
}
