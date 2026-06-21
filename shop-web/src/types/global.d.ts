// 全局类型定义

// API响应基础结构
export interface ApiResponse<T = any> {
  code: number
  message?: string
  msg?: string
  data: T
  timestamp?: number
}

// 分页请求参数
export interface PageQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
}

// 分页响应结果
export interface PageResult<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  pages: number
}
