'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function PaymentProcessingView() {
  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <Loader2 className="h-20 w-20 mx-auto mb-6 animate-spin text-primary" />
      <h2 className="text-2xl font-serif font-semibold mb-4 text-foreground">正在确认支付结果</h2>
      <p className="text-muted-foreground">请勿重复提交或关闭页面，系统正在更新订单状态。</p>
    </motion.div>
  )
}
