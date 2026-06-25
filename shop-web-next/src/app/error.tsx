'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * 路由级错误边界
 * 捕获子路由段抛出的运行时错误，避免整个应用白屏
 * Next.js App Router 约定：error.tsx 必须是 Client Component
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 上报错误到监控平台（此处仅控制台记录，可扩展为Sentry等）
    console.error('路由错误边界捕获:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-semibold text-foreground">
            页面出错了
          </h2>
          <p className="text-sm text-muted-foreground">
            抱歉，页面加载时遇到问题。可以尝试重新加载，或返回首页继续浏览。
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-left text-xs bg-muted/50 rounded-lg p-3 border border-border/50">
            <summary className="cursor-pointer text-muted-foreground">
              错误详情（仅开发环境）
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all text-destructive">
              {error.message}
              {error.digest ? `\nDigest: ${error.digest}` : ''}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="rounded-full bg-white text-foreground border-foreground/20 hover:bg-accent hover:text-accent-foreground"
          >
            重试
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="rounded-full glass hover:bg-white hover:text-foreground hover:border-foreground/20"
          >
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
