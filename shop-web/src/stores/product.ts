import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProductById, getRecommendProducts, recognizeImage } from '@/api/product'
import type { Product, RecognitionResponse } from '@/api/types/product'
import { ElMessage } from 'element-plus'

export const useProductStore = defineStore('product', () => {
  // State
  const currentProduct = ref<Product | null>(null)
  const productList = ref<Product[]>([])
  const recognitionResult = ref<RecognitionResponse | null>(null)
  const loading = ref(false)

  // Actions
  const fetchProductById = async (id: number) => {
    loading.value = true
    try {
      const res = await getProductById(id)
      currentProduct.value = res as Product
      return res
    } catch (error) {
      ElMessage.error('获取商品详情失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchRecommendProducts = async (categoryId?: number, limit: number = 10) => {
    loading.value = true
    try {
      const res = await getRecommendProducts(categoryId, limit)
      productList.value = res as Product[]
      return res
    } catch (error) {
      ElMessage.error('获取推荐商品失败')
      return []
    } finally {
      loading.value = false
    }
  }

  const recognize = async (file: File, uid?: number) => {
    loading.value = true
    try {
      const res = await recognizeImage(file, uid)
      recognitionResult.value = res as RecognitionResponse
      
      if (res.status === 'success') {
        ElMessage.success('识别成功')
      } else {
        ElMessage.warning(res.message || '未识别到商品')
      }
      
      return res
    } catch (error) {
      ElMessage.error('识别失败，请重试')
      return null
    } finally {
      loading.value = false
    }
  }

  const clearRecognitionResult = () => {
    recognitionResult.value = null
  }

  return {
    currentProduct,
    productList,
    recognitionResult,
    loading,
    fetchProductById,
    fetchRecommendProducts,
    recognize,
    clearRecognitionResult
  }
})
