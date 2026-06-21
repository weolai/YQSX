'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

export function Navbar() {
  const router = useRouter()
  const { userInfo, isLoggedIn, logout } = useAuthStore()
  const isClient = useIsClient()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
              YQSX
            </span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
              首页
            </Link>
            <Link href="/recognize" className="text-sm font-medium hover:text-primary transition-colors">
              拍照识别
            </Link>
            <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
              商品列表
            </Link>
            <Link href="/orders" className="text-sm font-medium hover:text-primary transition-colors">
              我的订单
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {!isClient ? (
              <div className="h-10 w-10 rounded-full bg-muted/50" />
            ) : isLoggedIn && userInfo ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white">
                        {userInfo.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userInfo.username}</p>
                      <p className="text-xs text-muted-foreground">ID: {userInfo.userId}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/orders')}>
                    我的订单
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
