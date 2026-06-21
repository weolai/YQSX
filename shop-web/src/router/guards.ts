import router from './index'
import { ElMessage } from 'element-plus'

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - YQSX智能零食商城`
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    
    if (!token) {
      ElMessage.warning('请先登录')
      next('/login')
      return
    }
  }

  // 如果已登录访问登录页，跳转到首页
  if (to.path === '/login') {
    const token = localStorage.getItem('token')
    if (token) {
      next('/')
      return
    }
  }

  next()
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  ElMessage.error('页面加载失败')
})
