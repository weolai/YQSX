// 认证相关类型定义

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

export interface CurrentUserResponse {
  service: string
  port: string
  userId: string
}
