import { create } from 'zustand'
import { authApi } from '@/lib/api'
import type { UserInfo } from '@/types'

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  isLoggedIn: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  setUserInfo: (info: UserInfo) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  userInfo: typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('userInfo') || 'null') 
    : null,
  isLoggedIn: typeof window !== 'undefined' ? !!localStorage.getItem('token') : false,
  
  login: async (username: string, password: string) => {
    try {
      const res = await authApi.login(username, password)
      const loginData = res.data || res
      
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
    set({
      token: null,
      userInfo: null,
      isLoggedIn: false
    })
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  },
  
  setUserInfo: (info: UserInfo) => {
    set({ userInfo: info })
    if (typeof window !== 'undefined') {
      localStorage.setItem('userInfo', JSON.stringify(info))
    }
  }
}))
