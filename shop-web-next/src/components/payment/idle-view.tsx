'use client'

import { motion } from 'framer-motion'
import { Clock, Package, ShieldCheck } from 'lucide-react'
import { TextShimmer } from '@/components/ui/shimmer-text'
import { MagneticButton } from '@/components/design/magnetic-button'
import type { Order } from '@/types'

interface PaymentIdleViewProps {
  order: Order | null
  countdown: number
  totalAmount: number
  formatTime: (seconds: number) => string
  onPay: () => void
}

export function PaymentIdleView({
  order,
  countdown,
  totalAmount,
  formatTime,
  onPay
}: PaymentIdleViewProps) {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-3" as="span">
        收银台
      </TextShimmer>
      <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-8 text-foreground tracking-tight">
        订单支付
      </h1>

      {order && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-6 mb-6 border border-primary/10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">订单编号：#{order.id}</p>
                <p className="font-medium text-foreground line-clamp-1">{order.productName} x {order.number}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-1">支付金额</p>
              <p className="text-5xl font-serif font-semibold text-primary">
                ¥{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2 flex items-center justify-center">
              <Clock className="mr-1.5 h-4 w-4 text-accent" />
              剩余支付时间
            </p>
            <p className={`text-3xl font-bold font-mono ${countdown < 60 ? 'text-destructive' : 'text-accent'}`}>
              {formatTime(countdown)}
            </p>
          </div>
        </div>
      )}

      <MagneticButton
        onClick={onPay}
        disabled={countdown === 0}
        className="w-full h-14 text-lg font-semibold bg-white text-foreground border border-foreground/20 hover:bg-accent hover:text-accent-foreground shadow-lg shadow-black/10 tracking-wide"
      >
        <ShieldCheck className="mr-2 h-5 w-5" />
        {countdown === 0 ? '支付已超时' : '确认支付'}
      </MagneticButton>

      <p className="mt-4 text-xs text-muted-foreground">
        点击确认支付即表示你确认订单信息并继续完成支付。
      </p>
    </motion.div>
  )
}
