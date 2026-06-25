/**
 * 全局类型声明
 */
declare global {
  interface Window {
    /**
     * 401 跳转去重锁，避免多个并发 401 触发多次跳转
     */
    __redirectingToLogin?: boolean
  }
}

export {}
