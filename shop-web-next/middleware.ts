import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  // 检查是否有 localStorage 中的 token（通过请求头传递）
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isPublicPage = request.nextUrl.pathname === '/' || isLoginPage

  // 如果访问登录页且已登录，重定向到首页
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 如果访问受保护页面且未登录，重定向到登录页
  if (!isPublicPage && !token) {
    // 对于客户端路由，我们无法直接访问 localStorage
    // 所以这里只做基本的 cookie 检查
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
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
