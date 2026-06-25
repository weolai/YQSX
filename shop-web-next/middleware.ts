import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 解析 JWT payload，校验过期时间
 * 注意：中间件不验签（验签由后端网关负责），仅检查 token 结构和过期时间
 * 防止过期 token 绕过路由守卫
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    // JWT payload 是 base64url 编码
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(payload))
    if (!decoded.exp) return false
    // exp 是秒级时间戳
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isPublicPage = request.nextUrl.pathname === '/' || isLoginPage

  // 如果访问登录页且已登录（token 有效），重定向到首页
  if (isLoginPage && token && !isTokenExpired(token)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 如果访问受保护页面且未登录或 token 过期，重定向到登录页
  if (!isPublicPage) {
    if (!token || isTokenExpired(token)) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
