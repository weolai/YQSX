"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Camera, Sparkles, ShoppingBag, Zap, ArrowRight, ListOrdered } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card } from "@/components/ui/card";
import { PixelHero } from "@/components/ui/pixel-hero";
import { TextShimmer } from "@/components/ui/shimmer-text";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/design/scroll-reveal";
import { AnimatedCounter } from "@/components/design/animated-counter";
import { MagneticButton } from "@/components/design/magnetic-button";

// Sprint 3 性能优化:three.js 组件动态导入,不进入首屏 bundle,SSR 禁用
// 此前 FloatingSnacks 静态导入导致首屏 bundle 体积增加 ~400KB
const FloatingSnacks = dynamic(
  () => import("@/components/three/floating-snacks").then((m) => m.FloatingSnacks),
  { ssr: false, loading: () => null }
);

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: Camera,
      title: "拍照识别",
      description: "上传零食照片，系统将识别图中商品，并推荐相似零食。",
      linkText: "去识别",
      href: "/recognize",
    },
    {
      icon: Sparkles,
      title: "智能推荐",
      description: "根据你的浏览与购买偏好，为你推荐更可能感兴趣的零食。",
      linkText: "看推荐",
      href: "/recommend",
    },
    {
      icon: ListOrdered,
      title: "快速下单",
      description: "查看商品详情后可直接创建订单，支付状态实时更新。",
      linkText: "开始购买",
      href: "/orders",
    },
  ];

  const stats = [
    { value: 19, suffix: "+", label: "品类覆盖" },
    { value: 95, suffix: "%", label: "识别能力" },
    { value: 3, suffix: "s", label: "响应体验", decimals: 1 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="relative">
        {/* Hero with 3D floating snacks */}
        <div className="relative">
          <FloatingSnacks />
          <PixelHero
            word1="拍照识别零食，"
            word2="推荐你可能爱吃的商品"
            description="上传零食照片，系统将识别图中商品，并结合你的浏览偏好推荐相似零食。也可以直接浏览商品，快速完成下单。"
            primaryCta="立即拍照识别"
            secondaryCta="先逛逛商品"
            onPrimaryClick={() => router.push("/recognize")}
            onSecondaryClick={() => router.push("/products")}
          />
        </div>

        {/* Features Section */}
        <section className="relative py-24 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal className="text-center mb-16">
              <TextShimmer className="text-sm font-medium tracking-wider uppercase mb-4" as="span">
                核心能力
              </TextShimmer>
              <h2 className="text-2xl md:text-3xl font-serif font-semibold tracking-tight mb-4">
                让零食购物更简单
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                从图片识别、商品推荐到订单支付，YQSX 将零食购买流程整合为更高效、更直观的一站式体验。
              </p>
            </ScrollReveal>

            <StaggerContainer className="grid md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <StaggerItem key={feature.title}>
                  <motion.div
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    onClick={() => router.push(feature.href)}
                    className="cursor-pointer h-full"
                  >
                    <Card className="p-8 h-full glass hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-border/50 group">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <feature.icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {feature.linkText}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </Card>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative py-24 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
          <div className="container mx-auto max-w-5xl relative">
            <ScrollReveal>
              <Card className="p-12 glass border-border/50">
                <p className="text-xs text-muted-foreground text-center mb-6">实验环境数据，仅供展示参考</p>
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  {stats.map((stat) => (
                    <div key={stat.label} className="space-y-2">
                      <div className="text-5xl md:text-6xl font-serif font-semibold text-primary">
                        <AnimatedCounter
                          value={stat.value}
                          suffix={stat.suffix}
                          decimals={stat.decimals}
                        />
                      </div>
                      <p className="text-muted-foreground text-lg">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </ScrollReveal>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 px-4 sm:px-6">
          <div className="container mx-auto max-w-4xl">
            <ScrollReveal>
              <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center border border-border/60 bg-gradient-to-br from-background via-secondary/40 to-background shadow-xl shadow-primary/5">
                {/* Soft accent blobs */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-accent/10 blur-3xl" />
                <div className="absolute inset-0 grain opacity-30" />

                {/* Floating snack decorations */}
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-8 left-8 text-3xl opacity-60 select-none"
                >
                  🍪
                </motion.div>
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-10 right-12 text-2xl opacity-50 select-none"
                >
                  🍬
                </motion.div>
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-8 right-8 text-3xl opacity-60 select-none"
                >
                  🍩
                </motion.div>

                <div className="relative z-10">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    智能购物体验
                  </span>
                  <h2 className="text-2xl md:text-4xl font-serif font-semibold text-foreground mb-6 tracking-tight">
                    准备好发现新口味了吗？
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                    上传照片或浏览商品，让系统为你推荐更合适的零食选择。
                  </p>
                  <MagneticButton
                    onClick={() => router.push("/recognize")}
                    className="h-14 px-8 text-base font-semibold bg-white text-foreground border border-foreground/20 shadow-lg shadow-black/10 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    立即体验
                  </MagneticButton>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 px-4 sm:px-6">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 YQSX 智能零食商城. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>智能识别 · 个性化推荐 · 安心下单</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
