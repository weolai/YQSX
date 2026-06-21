import request from '@/utils/request'
import type { Product, RecognitionResponse, ProductQuery } from './types/product'

// 商品详情
export const getProductById = (id: number) => {
  return request.get<Product>(`/products/${id}`)
}

// 推荐商品
export const getRecommendProducts = (categoryId?: number, limit: number = 10) => {
  return request.get<Product[]>('/products/recommend', {
    params: { categoryId, limit }
  })
}

// 拍照识别
export const recognizeImage = (file: File, uid?: number) => {
  const formData = new FormData()
  formData.append('file', file)
  if (uid) {
    formData.append('uid', uid.toString())
  }
  
  return request.post<RecognitionResponse>('/products/recognize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000 // 图片识别可能较慢，设置60秒超时
  })
}
