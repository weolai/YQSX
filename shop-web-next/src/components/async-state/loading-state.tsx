"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 统一的加载骨架屏组件。
 * - 不传 children：渲染 rows 个默认骨架卡片（适配列表场景）
 * - 传 children：渲染自定义骨架布局（适配详情/网格场景）
 */
export function LoadingState({ rows = 3, className, children }: LoadingStateProps) {
  if (children) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("space-y-4", className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="p-6 glass border-border/50 rounded-2xl">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      ))}
    </motion.div>
  );
}
