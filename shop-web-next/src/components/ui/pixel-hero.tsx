"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { MagneticButton } from "@/components/design/magnetic-button";
import { PixelCanvas } from "@/components/three/pixel-canvas";

interface PixelHeroProps {
  word1?: string;
  word2?: string;
  description?: string;
  primaryCta?: string;
  secondaryCta?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

const THEME_COLORS = [
  "rgba(163, 153, 145, 0.4)",
  "rgba(163, 153, 145, 0.4)",
  "rgba(163, 153, 145, 0.3)",
  "rgba(196, 126, 79, 0.5)",
  "rgba(232, 146, 124, 0.45)",
];

export function PixelHero({
  word1 = "拍照识别零食，",
  word2 = "推荐你可能爱吃的商品",
  description = "上传零食照片，系统将识别图中商品，并结合你的浏览偏好推荐相似零食。也可以直接浏览商品，快速完成下单。",
  primaryCta = "立即拍照识别",
  secondaryCta = "先逛逛商品",
  onPrimaryClick,
  onSecondaryClick,
}: PixelHeroProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTimer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(loadTimer);
  }, []);

  return (
    <section className="relative w-full min-h-[90dvh] md:min-h-[95dvh] flex flex-col justify-center py-20 px-4 sm:px-6 overflow-hidden isolate grain">
      {/* Canvas background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <PixelCanvas colors={THEME_COLORS} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)] pointer-events-none opacity-70" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">智能识别 · 个性化推荐 · 快速下单</span>
        </motion.div>

        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-semibold tracking-tight mb-8">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="block text-foreground"
          >
            {word1}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="block text-primary italic"
          >
            {word2}
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isLoaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <MagneticButton
            onClick={onPrimaryClick}
            className="h-14 px-8 text-base font-semibold bg-white text-foreground border border-foreground/20 shadow-lg shadow-black/10 hover:bg-accent hover:text-accent-foreground transition-all"
          >
            {primaryCta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </MagneticButton>

          <MagneticButton
            onClick={onSecondaryClick}
            className="h-14 px-8 text-base font-semibold bg-white/80 backdrop-blur-sm text-foreground border border-foreground/20 hover:bg-white hover:text-accent-foreground transition-all"
          >
            {secondaryCta}
          </MagneticButton>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </section>
  );
}
