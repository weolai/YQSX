# 前端项目实施指南（Next.js 16 + React 19）

> 本文档是 `implementation-guide.md` 的 Next.js 版本，覆盖从项目创建、Tailwind CSS / shadcn 风格组件配置、核心页面实现到部署验证的完整流程。
> 技术栈：**Next.js 16**、**React 19**、**TypeScript**、**Tailwind CSS v4**、**Zustand**、**Axios**、**Radix UI + CVA**（类 shadcn/ui 组件）。

---

## 📋 总览

本指南提供完整的前端项目实施步骤，基于 `shop-web-next` 项目结构，对应 Spring Cloud 后端网关 `http://localhost:8080/api`。

---

## ✅ 第一步：更新商品图片（必须先执行）

与 Vue 版本相同，首先更新商品图片：

```bash
# Windows 环境
cd d:/Programming/YQSX
execute_update_images.bat
```

或手动执行 SQL：

```bash
mysql -u root -p1234 shop-product < update_product_images.sql
```

验证：

```sql
USE shop-product;
SELECT id, name, image_url FROM t_product ORDER BY id LIMIT 5;
```

---

## 🚀 第二步：创建 Next.js 项目

### 2.1 环境检查

```bash
# 需要 Node.js 18.x+
node -v
npm -v
```

### 2.2 创建项目

```bash
cd d:/Programming/YQSX
npx create-next-app@latest shop-web-next \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd shop-web-next
```

### 2.3 安装核心依赖

```bash
# HTTP 客户端
npm install axios

# 状态管理
npm install zustand

# 图标
npm install lucide-react

# 动画
npm install framer-motion

# 类 shadcn/ui 组件依赖：Radix 基础组件 + CVA + 类名合并
npm install @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar
npm install class-variance-authority clsx tailwind-merge

# 类型支持
npm install -D @types/node
```

> 说明：本项目未使用 `shadcn/ui` CLI，而是采用 **Radix UI 无头组件 + Tailwind CSS + CVA** 手动实现类 shadcn 风格组件，拥有完全自定义能力。

---

## 🎨 第三步：配置 Tailwind CSS v4 与全局样式

### 3.1 PostCSS 配置

`postcss.config.mjs`：

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### 3.2 Tailwind 配置

`tailwind.config.ts`：

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 3.3 全局样式

`src/app/globals.css`（关键部分）：

```css
@import "tailwindcss";
@config "../../tailwind.config.ts";

@layer base {
  :root {
    --background: 30 50% 97%;
    --foreground: 25 30% 13%;
    --card: 30 40% 99%;
    --card-foreground: 25 30% 13%;
    --popover: 30 40% 99%;
    --popover-foreground: 25 30% 13%;
    --primary: 25 55% 55%;
    --primary-foreground: 0 0% 100%;
    --secondary: 40 20% 93%;
    --secondary-foreground: 25 30% 13%;
    --muted: 35 20% 90%;
    --muted-foreground: 25 10% 45%;
    --accent: 12 70% 70%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 30 20% 88%;
    --input: 30 20% 88%;
    --ring: 25 55% 55%;
    --radius: 1rem;
  }

  .dark {
    --background: 25 20% 10%;
    --foreground: 30 30% 96%;
    /* ... */
  }
}

@layer base {
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

### 3.4 类名合并工具

`src/lib/utils.ts`：

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

> `cn()` 是类 shadcn 组件的核心：先用 `clsx` 合并条件类名，再用 `tailwind-merge` 解决 Tailwind 类名冲突。

---

## 📁 第四步：创建项目目录结构

```
shop-web-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes（可选，如 KBOQA 聊天接口）
│   │   ├── login/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx        # 商品列表
│   │   │   └── [id]/page.tsx   # 商品详情
│   │   ├── recognize/page.tsx  # AI 识别页
│   │   ├── orders/page.tsx
│   │   ├── payment/[orderId]/page.tsx
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   └── error.tsx           # 错误边界
│   ├── components/
│   │   ├── ui/                 # 类 shadcn 基础组件
│   │   ├── auth/               # 登录/注册表单
│   │   ├── layout/             # Navbar 等布局组件
│   │   ├── recognize/          # AI 识别相关组件
│   │   └── design/             # 动画/视觉组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/
│   │   ├── api/                # Axios 封装 + API 接口
│   │   ├── stores/             # Zustand 状态管理
│   │   └── utils.ts            # cn 等工具
│   └── types/                  # TypeScript 类型
├── middleware.ts               # 路由守卫 / JWT 校验
├── next.config.ts              # Next.js 配置（含 API 代理）
├── tailwind.config.ts          # Tailwind 主题扩展
├── postcss.config.mjs          # Tailwind v4 PostCSS 插件
└── package.json
```

---

## ⚙️ 第五步：核心配置

### 5.1 next.config.ts（API 代理 + 图片域名）

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/api/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8081',
        pathname: '/**',
      },
    ],
  },

  async rewrites() {
    return [
      // DIN 推荐服务代理
      {
        source: '/api/din/:path*',
        destination: 'http://127.0.0.1:8000/api/recommend/:path*',
      },
      // 统一网关代理
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
```

> 前端请求统一使用相对路径 `/api/...`，由 Next.js 开发服务器 rewrite 到后端服务，避免浏览器跨域。

### 5.2 middleware.ts（路由守卫）

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(payload))
    if (!decoded.exp) return false
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isPublicPage = request.nextUrl.pathname === '/' || isLoginPage

  if (isLoginPage && token && !isTokenExpired(token)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isPublicPage) {
    if (!token || isTokenExpired(token)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

### 5.3 Axios 封装（src/lib/api/request.ts）

```typescript
import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios'

const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器：注入 Token
instance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
}, (error: AxiosError) => Promise.reject(error))

// 响应拦截器：统一错误处理
instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    const status = error.response?.status
    if (typeof window !== 'undefined') {
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        document.cookie = 'token=; path=/; max-age=0; SameSite=Strict'
        if (!window.__redirectingToLogin) {
          window.__redirectingToLogin = true
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.get(url, config) as unknown as Promise<T>,
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.post(url, data, config) as unknown as Promise<T>,
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    instance.put(url, data, config) as unknown as Promise<T>,
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.delete(url, config) as unknown as Promise<T>,
}

export default request
```

在 `src/types/global.d.ts` 中补充：

```typescript
declare global {
  interface Window {
    __redirectingToLogin?: boolean
  }
}

export {}
```

### 5.4 Zustand 状态管理（src/lib/stores/auth.ts）

```typescript
import { create } from 'zustand'
import { authApi } from '@/lib/api'
import type { UserInfo } from '@/types'

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  isLoggedIn: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  setAuth: (token: string, userId: number, username: string) => void
}

function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

function syncTokenToCookie(token: string | null): void {
  if (typeof document === 'undefined') return
  if (token) {
    document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Strict`
  } else {
    document.cookie = 'token=; path=/; max-age=0; SameSite=Strict'
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  userInfo: typeof window !== 'undefined'
    ? safeParse<UserInfo | null>(localStorage.getItem('userInfo'), null)
    : null,
  isLoggedIn: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,

  login: async (username, password) => {
    try {
      const res = await authApi.login(username, password)
      if (res.code === 200) {
        const userInfo = { userId: res.userId, username: res.username, token: res.token }
        set({ token: res.token, userInfo, isLoggedIn: true })
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', res.token)
          localStorage.setItem('userInfo', JSON.stringify(userInfo))
          syncTokenToCookie(res.token)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  },

  logout: () => {
    set({ token: null, userInfo: null, isLoggedIn: false })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      syncTokenToCookie(null)
    }
  },

  setAuth: (token, userId, username) => {
    const userInfo = { userId, username, token }
    set({ token, userInfo, isLoggedIn: true })
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      syncTokenToCookie(token)
    }
  },
}))
```

---

## 🧩 第六步：类 shadcn 基础组件

### 6.1 Button 组件（src/components/ui/button.tsx）

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### 6.2 Card 组件（src/components/ui/card.tsx）

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export { Card, CardContent }
```

---

## 🎨 第七步：核心页面实现

### 7.1 根布局（src/app/layout.tsx）

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YQSX 智能零食商城",
  description: "AI 驱动的智能购物体验",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
```

### 7.2 登录页（src/app/login/page.tsx）

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const success = await login(username, password);
    if (success) {
      router.push("/products");
    } else {
      setError("用户名或密码错误");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8 border rounded-xl shadow">
        <h1 className="text-2xl font-bold text-center">登录</h1>
        <div>
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
          />
        </div>
        <div>
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "登录中..." : "登录"}
        </Button>
      </form>
    </div>
  );
}
```

### 7.3 AI 识别页（src/app/recognize/page.tsx）

核心逻辑：

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import { productApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRecognition } from "@/hooks/use-recognition";

export default function RecognizePage() {
  const { userInfo } = useAuthStore();
  const [recommendList, setRecommendList] = useState<number[]>([]);
  const { selectedImage, isLoading, result, error, handleFileChange, handleUploadClick, fileInputRef } = useRecognition();

  useEffect(() => {
    if (!userInfo?.userId) return;
    productApi.getDinTopKFromBackend(userInfo.userId, 40)
      .then((res) => setRecommendList((res.products ?? []).map((p) => p.id)))
      .catch(() => setRecommendList([]));
  }, [userInfo?.userId]);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI 拍照识别</h1>

      <Card className="p-6 mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={handleUploadClick}>选择图片</Button>

        {selectedImage && (
          <img src={selectedImage} alt="preview" className="mt-4 max-h-80 rounded-lg" />
        )}

        {isLoading && <p className="mt-4 text-muted-foreground">识别中...</p>}
        {error && <p className="mt-4 text-destructive">{error}</p>}
        {result && (
          <div className="mt-4">
            <p>识别结果：{result.detectedClass}</p>
            <p>置信度：{(result.confidence * 100).toFixed(2)}%</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">DIN 推荐商品 ID</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {recommendList.slice(0, 10).map((id, i) => (
            <div key={id} className="px-4 py-3 border rounded-lg text-center font-mono">
              #{i + 1} {id}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
```

### 7.4 识别 Hook（src/hooks/use-recognition.ts）

```typescript
import { useState, useRef, useEffect } from 'react'
import { productApi } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'
import type { RecognitionResponse } from '@/types'

export function useRecognition() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { userInfo } = useAuthStore()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RecognitionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (selectedImage) URL.revokeObjectURL(selectedImage)
    }
  }, [selectedImage])

  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }
    if (selectedImage) URL.revokeObjectURL(selectedImage)

    setSelectedImage(URL.createObjectURL(file))
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await productApi.recognize(file, userInfo?.userId)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别服务暂时不可用')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  return {
    selectedImage,
    isLoading,
    result,
    error,
    fileInputRef,
    handleFileChange,
    handleUploadClick,
  }
}
```

---

## 🔌 第八步：API 接口聚合（src/lib/api/index.ts）

```typescript
import request from './request'
import type { LoginResponse, Product, RecognitionResponse } from '@/types'

export const authApi = {
  login: (username: string, password: string) =>
    request.post<LoginResponse>('/user/login', { username, password }),
}

export const productApi = {
  getById: (id: number) => request.get<Product>(`/products/${id}`),

  getList: (categoryId?: number) =>
    request.get<Product[]>('/products/list', {
      params: categoryId ? { categoryId } : undefined,
    }),

  recognize: (file: File, uid?: number) => {
    const formData = new FormData()
    formData.append('file', file)
    if (uid) formData.append('uid', uid.toString())
    return request.post<RecognitionResponse>('/products/recognize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },

  getDinTopKFromBackend: (userId: number, k: number = 8) =>
    request.get<{ products: Product[] }>('/products/din/topk', {
      params: { userId, k },
    }),
}

export const orderApi = {
  create: (pid: number, uid: number) =>
    request.post('/orders/save', { pid, uid }),

  getListByUid: (uid: number) =>
    request.get<Order[]>(`/orders/list/${uid}`),
}

export const paymentApi = {
  pay: (orderId: number) => {
    const params = new URLSearchParams()
    params.append('orderId', orderId.toString())
    return request.post('/payment/pay', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}
```

---

## ✅ 第九步：类型定义（src/types/index.ts）

```typescript
export interface ApiResponse<T = unknown> {
  code: number
  message?: string
  msg?: string
  data: T
}

export interface LoginResponse {
  code: number
  msg: string
  token: string
  userId: number
  username: string
}

export interface UserInfo {
  userId: number
  username: string
  token?: string
}

export interface Product {
  id: number
  name: string
  price: number
  stock: number
  categoryId: number
  imageUrl: string
  sales: number
  categoryName?: string
}

export interface RecognitionResponse {
  code: number
  msg: string
  detectedClass?: string
  confidence?: number
  products?: Product[]
}

export interface Order {
  id: number
  productId: number
  userId: number
  status: string
  totalAmount: number
  createTime: string
}
```

---

## 🧪 第十步：运行与验证

### 10.1 开发模式

```bash
cd d:/Programming/YQSX/shop-web-next
npm run dev
```

访问：`http://localhost:3000`

### 10.2 构建生产包

```bash
npm run build

# 输出目录 .next/
# 生产启动
npm run start
```

### 10.3 功能验证清单

| 功能 | 验证步骤 | 预期结果 |
|------|---------|---------|
| 登录 | 输入用户名/密码，点击登录 | 跳转 `/products` |
| 路由守卫 | 未登录访问 `/recognize` | 重定向 `/login` |
| AI 识别 | 上传零食图片 | 显示识别类别与推荐商品 |
| DIN 推荐 | 登录后进入 `/recognize` | 显示 Top40 商品 ID |
| 商品详情 | 访问 `/products/1` | 显示商品信息 |
| 支付流程 | 创建订单 → 支付 | 订单状态变为 PAID |

---

## 📋 开发建议总结

### ✅ 已实施

1. ✅ 使用 Unsplash 占位图快速启动
2. ✅ 优先开发 AI 识别页（核心功能）
3. ✅ 使用 Tailwind CSS v4 + 类 shadcn 组件体系
4. ✅ Next.js App Router + 中间件路由守卫
5. ✅ Zustand 客户端状态管理
6. ✅ Axios 统一封装 + Next.js rewrites 代理
7. ✅ 图片加载失败兜底逻辑

### 📝 待完善

1. ⏳ 响应式布局适配（移动端优化）
2. ⏳ 性能优化（React.memo、useMemo、图片懒加载）
3. ⏳ 单元测试与 E2E 测试
4. ⏳ 服务端组件与客户端组件边界优化
5. ⏳ Server Actions 替代部分 API Routes

---

## 🎯 后续开发顺序

### Phase 1：核心页面

- [x] AI 识别页 `/recognize`
- [x] 登录页 `/login`
- [x] 商品列表 `/products`
- [x] 商品详情 `/products/:id`

### Phase 2：订单与支付

- [x] 订单创建
- [x] 订单列表 `/orders`
- [x] 订单详情 `/orders/:id`
- [x] 订单支付 `/payment/:orderId`

### Phase 3：完善功能

- [ ] 用户中心 `/user`
- [ ] 响应式适配
- [ ] 性能优化
- [ ] 单元测试

---

## 🔗 参考文档

- [快速参考手册](./quick-reference.md)
- [启动问题排查](./startup-troubleshooting.md)
- [API 规范](./api-standard.md)
- [项目状态报告](./project-status.md)

---

**文档版本**: v1.0  
**创建时间**: 2026-06-25  
**技术栈**: Next.js 16 / React 19 / TypeScript / Tailwind CSS v4 / Zustand / Radix UI / CVA
