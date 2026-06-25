'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentSuccessViewProps {
  orderId: number
}

export function PaymentSuccessView({ orderId }: PaymentSuccessViewProps) {
  const router = useRouter()

  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
      </div>
      <h2 className="text-2xl font-serif font-semibold mb-4 text-foreground">支付成功！</h2>
      <p className="text-muted-foreground mb-6">正在跳转到订单详情...</p>
      <Button
        variant="outline"
        onClick={() => router.push(`/orders/${orderId}`)}
        className="rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20"
      >
        立即查看订单
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </motion.div>
  )
}
