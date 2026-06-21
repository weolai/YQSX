'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Navbar } from '@/components/layout/navbar'
import { Camera, Sparkles, ShoppingBag, Zap } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  const features = [
    {
      icon: Camera,
      title: '智能识别',
      description: '拍照即可识别零食，精准度高达95%',
      color: 'from-pink-500 to-rose-500',
      href: '/recognize'
    },
    {
      icon: Sparkles,
      title: 'AI推荐',
      description: '基于您的喜好智能推荐相似商品',
      color: 'from-orange-500 to-amber-500',
      href: '/products'
    },
    {
      icon: ShoppingBag,
      title: '便捷下单',
      description: '一键购买，快速完成订单',
      color: 'from-purple-500 to-pink-500',
      href: '/orders'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">
                YQSX 智能零食商城
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              AI 驱动的智能购物体验 · 拍照识别 · 智能推荐
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => router.push('/recognize')}
              className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Camera className="mr-2 h-5 w-5" />
              开始识别
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/products')}
              className="h-14 px-8 text-lg font-semibold border-2 hover:bg-gray-50 transition-all duration-300"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              浏览商品
            </Button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="grid md:grid-cols-3 gap-8 mb-20"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={() => router.push(feature.href)}
              className="cursor-pointer"
            >
              <Card className="p-8 h-full backdrop-blur-sm bg-white/80 border-0 shadow-lg hover:shadow-2xl transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-lg">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-center"
        >
          <Card className="p-12 backdrop-blur-sm bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-0">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  19+
                </div>
                <p className="text-gray-600 text-lg">零食品类</p>
              </div>
              <div>
                <div className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  95%
                </div>
                <p className="text-gray-600 text-lg">识别精度</p>
              </div>
              <div>
                <div className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  <Zap className="inline h-12 w-12 mb-2" />
                </div>
                <p className="text-gray-600 text-lg">秒级响应</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
