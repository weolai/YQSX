import request from '@/utils/request'
import type { LoginResponse, CurrentUserResponse } from './types/auth'

// 登录接口（注意：使用query参数，不是JSON body）
export const login = (username: string, password: string) => {
  return request.post<LoginResponse>(`/user/login?username=${username}&password=${password}`)
}

// 获取当前用户信息
export const getCurrentUser = () => {
  return request.get<CurrentUserResponse>('/user/current')
}
