'use client'

import { useEffect } from 'react'

/**
 * 全局错误边界
 * 捕获 root layout 抛出的致命错误（error.tsx 无法捕获 layout 错误）
 * Next.js 约定：global-error.tsx 必须包含 <html> 和 <body> 标签
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('全局错误边界捕获:', error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#faf8f5',
          color: '#1c1917',
        }}
      >
        <div style={{ maxWidth: 480, padding: '2rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            应用发生严重错误
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#78716c',
              marginBottom: '1.5rem',
            }}
          >
            抱歉，应用遇到致命问题。请尝试刷新页面，若问题持续请联系技术支持。
          </p>

          {process.env.NODE_ENV === 'development' && (
            <details
              style={{
                textAlign: 'left',
                fontSize: '0.75rem',
                backgroundColor: '#f5f5f4',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #e7e5e4',
                marginBottom: '1.5rem',
              }}
            >
              <summary style={{ cursor: 'pointer', color: '#78716c' }}>
                错误详情（仅开发环境）
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: '#b91c1c',
                }}
              >
                {error.message}
                {error.digest ? `\nDigest: ${error.digest}` : ''}
                {error.stack ? `\n\n${error.stack}` : ''}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '9999px',
                backgroundColor: '#1c1917',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              重试
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                color: '#1c1917',
                border: '1px solid #e7e5e4',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
