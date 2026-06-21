'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/lib/stores/auth'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore(state => state.login)
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!username || !password) {
      setError('请输入用户名和密码')
      return
    }

    setIsLoading(true)
    
    try {
      const success = await login(username, password)
      
      if (success) {
        router.push('/')
      } else {
        setError('登录失败，请检查用户名和密码')
      }
    } catch {
      setError('登录失败，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-orange-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 backdrop-blur-sm bg-white/80 shadow-2xl border-0">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">
              YQSX 智能零食商城
            </h1>
            <p className="text-gray-600">AI 驱动的智能购物体验</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-500 bg-red-50 p-3 rounded-md"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 transition-all duration-300"
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>测试账号：admin / 123456</p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
