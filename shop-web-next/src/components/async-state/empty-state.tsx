"use client";

import { ScrollReveal } from "@/components/design/scroll-reveal";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * 统一的空状态组件。
 * icon 放置于 primary/10 圆角容器内，title/description 上下堆叠，action 为可选操作。
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <ScrollReveal className={cn("text-center py-20", className)}>
      {icon && (
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      )}
      {(title || description) && (
        <div className="mb-6">
          {title && <p className="text-muted-foreground text-lg">{title}</p>}
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
        </div>
      )}
      {action}
    </ScrollReveal>
  );
}
