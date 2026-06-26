'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentFailedViewProps {
  countdown: number
  onRetry: () => void
}

export function PaymentFailedView({ countdown, onRetry }: PaymentFailedViewProps) {
  const router = useRouter()

  return (
    <motion.div
      key="failed"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <XCircle className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-2xl font-serif font-semibold mb-4 text-foreground">支付未完成</h2>
      <p className="text-muted-foreground mb-6">
        {countdown === 0 ? '支付时间已超时，请重新创建订单。' : '支付未能完成，请重新尝试或返回订单查看状态。'}
      </p>
      <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/products')}
            className="flex-1 rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20"
          >
            返回商品列表
          </Button>
          {countdown > 0 && (
            <Button
              onClick={onRetry}
              className="flex-1 rounded-full bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
            >
              重新支付
            </Button>
          )}
        </div>
    </motion.div>
  )
}
