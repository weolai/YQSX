import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { 
      title: '登录',
      requiresAuth: false 
    }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/index.vue'),
    meta: { 
      title: '首页',
      requiresAuth: true 
    }
  },
  {
    path: '/recognize',
    name: 'Recognize',
    component: () => import('@/views/recognize/index.vue'),
    meta: { 
      title: '拍照识别',
      requiresAuth: true,
      icon: 'mdi:camera'
    }
  },
  {
    path: '/products',
    name: 'ProductList',
    component: () => import('@/views/product/list/index.vue'),
    meta: { 
      title: '商品列表',
      requiresAuth: true,
      icon: 'mdi:shopping'
    }
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('@/views/product/detail/index.vue'),
    meta: { 
      title: '商品详情',
      requiresAuth: true 
    }
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: () => import('@/views/order/list/index.vue'),
    meta: { 
      title: '订单列表',
      requiresAuth: true,
      icon: 'mdi:file-document'
    }
  },
  {
    path: '/orders/create',
    name: 'OrderCreate',
    component: () => import('@/views/order/create/index.vue'),
    meta: { 
      title: '创建订单',
      requiresAuth: true 
    }
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: () => import('@/views/order/detail/index.vue'),
    meta: { 
      title: '订单详情',
      requiresAuth: true 
    }
  },
  {
    path: '/payment/:orderId',
    name: 'Payment',
    component: () => import('@/views/payment/index.vue'),
    meta: { 
      title: '订单支付',
      requiresAuth: true 
    }
  },
  {
    path: '/user/profile',
    name: 'UserProfile',
    component: () => import('@/views/user/profile/index.vue'),
    meta: { 
      title: '个人中心',
      requiresAuth: true 
    }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { 
      title: '无权限'
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { 
      title: '页面不存在'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
