'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { OrderStatus } from '@/types'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

const statusMap: Record<OrderStatus, { label: string; className: string }> = {
  [OrderStatus.WAIT_PAY]: {
    label: '待支付',
    className: 'bg-accent/10 text-accent border-accent/20',
  },
  [OrderStatus.PAID]: {
    label: '已支付',
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  [OrderStatus.FINISHED]: {
    label: '已完成',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  [OrderStatus.CANCELED]: {
    label: '已取消',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  [OrderStatus.DUPLICATE]: {
    label: '待支付',
    className: 'bg-accent/10 text-accent border-accent/20',
  },
  [OrderStatus.BLOCKED]: {
    label: '系统繁忙',
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusMap[status]

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
