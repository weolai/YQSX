"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/design/scroll-reveal";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * 统一的错误展示组件。
 * 默认使用 AlertCircle 图标，可通过 icon 属性自定义。
 */
export function ErrorState({ message, onRetry, className, icon }: ErrorStateProps) {
  return (
    <ScrollReveal className={cn("text-center py-20", className)}>
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
        {icon ?? <AlertCircle className="h-10 w-10 text-destructive/60" />}
      </div>
      <p className="text-muted-foreground text-lg mb-6">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
        >
          重新加载
        </Button>
      )}
    </ScrollReveal>
  );
}
