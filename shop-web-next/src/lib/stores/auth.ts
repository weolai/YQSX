import { create } from 'zustand'
import { authApi } from '@/lib/api'
import type { UserInfo } from '@/types'

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  isLoggedIn: boolean
  login: (username: string, password: string) => Promise<boolean>
  register: (data: { phone: string; code: string; username: string; password: string; nickname?: string }) => Promise<boolean | string>
  resetPassword: (data: { phone: string; code: string; newPassword: string }) => Promise<string | true>
  sendCode: (phone: string, type: 'REGISTER' | 'RESET_PASSWORD') => Promise<{ success: true; code: string } | string>
  setAuth: (token: string, userId: number, username: string) => void
  logout: () => void
  setUserInfo: (info: UserInfo) => void
}

/**
 * 安全解析 JSON，失败返回 fallback
 */
function safeParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

/**
 * 同步 token 到 cookie，供中间件读取（中间件无法访问 localStorage）
 * 注意：此 cookie 非 HttpOnly，仅用于中间件路由判断
 * 真正的鉴权由后端网关校验 Authorization 头完成
 */
function syncTokenToCookie(token: string | null): void {
  if (typeof document === 'undefined') return
  if (token) {
    // SameSite=Strict 防 CSRF，path=/ 全局可用，max-age=1天与 JWT 过期一致
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

  login: async (username: string, password: string) => {
    try {
      const res = await authApi.login(username, password)
      const loginData = res

      if (loginData.code === 200) {
        const userInfo = {
          userId: loginData.userId,
          username: loginData.username,
          token: loginData.token
        }

        set({
          token: loginData.token,
          userInfo,
          isLoggedIn: true
        })

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', loginData.token)
          localStorage.setItem('userInfo', JSON.stringify(userInfo))
          syncTokenToCookie(loginData.token)
        }

        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  },

  register: async (data) => {
    try {
      const res = await authApi.register(data)
      const registerData = res

      if (registerData.code === 200 && registerData.token) {
        const userInfo = {
          userId: registerData.userId!,
          username: registerData.username!,
          token: registerData.token
        }

        set({
          token: registerData.token,
          userInfo,
          isLoggedIn: true
        })

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', registerData.token)
          localStorage.setItem('userInfo', JSON.stringify(userInfo))
          syncTokenToCookie(registerData.token)
        }

        return true
      }
      return registerData.msg || '注册失败'
    } catch (error) {
      console.error('Register failed:', error)
      return '注册失败，请稍后再试'
    }
  },

  resetPassword: async (data) => {
    try {
      const res = await authApi.resetPassword(data)
      const resetData = res

      if (resetData.code === 200) {
        return true
      }
      return resetData.msg || '密码重置失败'
    } catch (error) {
      console.error('Reset password failed:', error)
      return '密码重置失败，请稍后再试'
    }
  },

  sendCode: async (phone, type) => {
    try {
      const res = await authApi.sendCode(phone, type)
      const codeData = res

      if (codeData.code === 200) {
        return { success: true as const, code: codeData.verifyCode || '' }
      }
      return codeData.msg || '验证码发送失败'
    } catch (error) {
      console.error('Send code failed:', error)
      return '验证码发送失败，请稍后再试'
    }
  },

  setAuth: (token: string, userId: number, username: string) => {
    const userInfo = { userId, username, token }
    set({ token, userInfo, isLoggedIn: true })
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      syncTokenToCookie(token)
    }
  },

  logout: () => {
    set({
      token: null,
      userInfo: null,
      isLoggedIn: false
    })

    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      syncTokenToCookie(null)
    }
  },

  setUserInfo: (info: UserInfo) => {
    set({ userInfo: info })
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInfo', JSON.stringify(info))
    }
  }
}))
