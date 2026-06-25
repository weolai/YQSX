'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type OrderStatus = 'WAIT_PAY' | 'PAID' | 'FINISHED' | 'CANCELED' | string

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

const statusMap: Record<string, { label: string; className: string }> = {
  WAIT_PAY: {
    label: '待支付',
    className: 'bg-accent/10 text-accent border-accent/20',
  },
  PAID: {
    label: '已支付',
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  FINISHED: {
    label: '已完成',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  CANCELED: {
    label: '已取消',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusMap[status] || { label: status, className: 'bg-muted text-muted-foreground' }

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
