import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createOrder, getOrderById, updateOrderStatus } from '@/api/order'
import type { Order } from '@/api/types/order'
import { ElMessage } from 'element-plus'

export const useOrderStore = defineStore('order', () => {
  // State
  const currentOrder = ref<Order | null>(null)
  const orderList = ref<Order[]>([])
  const loading = ref(false)

  // Actions
  const create = async (pid: number, uid: number) => {
    loading.value = true
    try {
      const res = await createOrder(pid, uid)
      
      if (res.code === 200) {
        ElMessage.success('订单创建成功')
        return res.orderId
      } else {
        ElMessage.error(res.msg || '订单创建失败')
        return null
      }
    } catch (error) {
      ElMessage.error('订单创建失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchOrderById = async (id: number) => {
    loading.value = true
    try {
      const res = await getOrderById(id)
      currentOrder.value = res as Order
      return res
    } catch (error) {
      ElMessage.error('获取订单详情失败')
      return null
    } finally {
      loading.value = false
    }
  }

  const updateStatus = async (orderId: number, status: string) => {
    loading.value = true
    try {
      await updateOrderStatus(orderId, status)
      ElMessage.success('订单状态更新成功')
      return true
    } catch (error) {
      ElMessage.error('订单状态更新失败')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    currentOrder,
    orderList,
    loading,
    create,
    fetchOrderById,
    updateStatus
  }
})
