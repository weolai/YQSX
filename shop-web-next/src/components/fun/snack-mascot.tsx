"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useSpring, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useIsClient } from "@/hooks/use-is-client";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { MascotFace, type Mood } from "@/components/fun/mascot-face";

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

const TIPS = [
  "点我一下，我会跳舞哦~",
  "去拍照识别看看新零食吧！",
  "今天想吃什么口味的零食？",
  "我可以陪你逛一整天~",
  "鼠标移开我要睡觉啦...",
  "试试点击我的脑袋！",
];

const MOODS: Mood[] = ["idle", "happy", "wink", "surprised", "love"];

export function SnackMascot() {
  const isClient = useIsClient();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [isHovered, setIsHovered] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isSleepy, setIsSleepy] = useState(false);
  const particleIdRef = useRef(0);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSleepTimer = () => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  };

  const scheduleSleep = useCallback(() => {
    if (reducedMotion) return;
    clearSleepTimer();
    sleepTimerRef.current = setTimeout(() => setIsSleepy(true), 12000);
  }, [reducedMotion]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const smoothY = useSpring(mouseY, { stiffness: 150, damping: 15 });
  const bodyRotate = useTransform(smoothX, [-20, 20], [-10, 10]);

  const eyeX = useSpring(0, { stiffness: 200, damping: 20 });
  const eyeY = useSpring(0, { stiffness: 200, damping: 20 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / 12;
      const dy = (e.clientY - centerY) / 12;

      mouseX.set(dx);
      mouseY.set(dy);
      eyeX.set(Math.max(-3, Math.min(3, dx / 3)));
      eyeY.set(Math.max(-3, Math.min(3, dy / 3)));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, eyeX, eyeY]);

  const handleClick = useCallback(() => {
    const nextIndex = (MOODS.indexOf(mood) + 1) % MOODS.length;
    setMood(MOODS[nextIndex]);
    setIsSleepy(false);
    scheduleSleep();

    const newParticles: Particle[] = [];
    const emojis = ["✨", "🍪", "💖", "⭐", "🍬"];
    for (let i = 0; i < 6; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: (Math.random() - 0.5) * 60,
        y: -20 - Math.random() * 30,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);

    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => setMood("idle"), 1200);
  }, [mood, scheduleSleep]);

  const handleHoverStart = () => {
    setIsHovered(true);
    setIsSleepy(false);
    clearSleepTimer();
    setTipIndex(Math.floor(Math.random() * TIPS.length));
  };

  const handleHoverEnd = () => {
    setIsHovered(false);
    scheduleSleep();
  };

  useEffect(() => {
    scheduleSleep();
    return () => {
      clearSleepTimer();
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isClient) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-1 mr-1 max-w-[200px] rounded-2xl bg-card px-4 py-2.5 text-xs font-medium text-foreground shadow-lg border border-border glass"
          >
            {TIPS[tipIndex]}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleClick}
        onMouseEnter={handleHoverStart}
        onMouseLeave={handleHoverEnd}
        animate={
          reducedMotion
            ? {}
            : {
                y: mood === "idle" ? [0, -4, 0] : 0,
                scale: isHovered ? 1.12 : 1,
              }
        }
        transition={
          mood === "idle"
            ? { y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
            : { type: "spring", stiffness: 300, damping: 15 }
        }
        style={{ x: smoothX, y: smoothY, rotate: bodyRotate }}
        className="relative w-20 h-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
        aria-label="零食小助手"
      >
        <svg
          viewBox="0 0 56 56"
          className="w-full h-full drop-shadow-2xl"
          shapeRendering="crispEdges"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="8" y="6" width="40" height="44" rx="10" fill="#d4a373" />
          <rect x="6" y="10" width="44" height="36" rx="8" fill="#e6b585" />

          <rect x="42" y="6" width="10" height="10" fill="hsl(var(--background))" />
          <rect x="46" y="14" width="8" height="8" fill="hsl(var(--background))" />

          <rect x="10" y="8" width="34" height="4" fill="#c48a5a" />
          <rect x="10" y="40" width="34" height="4" fill="#c48a5a" />
          <rect x="8" y="10" width="4" height="32" fill="#c48a5a" />
          <rect x="42" y="18" width="4" height="22" fill="#c48a5a" />

          <rect x="12" y="32" width="6" height="3" fill="#e8927c" />
          <rect x="36" y="32" width="6" height="3" fill="#e8927c" />

          <MascotFace mood={mood} isSleepy={isSleepy} eyeX={eyeX} eyeY={eyeY} />

          <rect x="18" y="48" width="6" height="4" rx="1" fill="#c48a5a" />
          <rect x="32" y="48" width="6" height="4" rx="1" fill="#c48a5a" />

          {isHovered && (
            <motion.rect
              x="2"
              y="24"
              width="6"
              height="12"
              rx="1"
              fill="#d4a373"
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -20, 0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              style={{ originX: "8px", originY: "30px" }}
            />
          )}
        </svg>

        {/* Click particle burst */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              onAnimationComplete={() =>
                setParticles((prev) => prev.filter((item) => item.id !== p.id))
              }
              className="absolute left-1/2 top-1/2 text-lg pointer-events-none select-none"
              style={{ marginLeft: -10, marginTop: -10 }}
            >
              {p.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.button>

      {/* Sleep Zzz */}
      <AnimatePresence>
        {isSleepy && !isHovered && (
          <div className="absolute -top-8 right-0 flex flex-col items-end gap-1 pointer-events-none">
            {["Z", "z", "z"].map((z, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 10, x: 0 }}
                animate={{ opacity: [0, 1, 0], y: -20 - i * 10, x: i * 6 }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.3, ease: "easeInOut" }}
                className="text-sm font-bold text-muted-foreground"
              >
                {z}
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : [0, 1, 1, 0] }}
        transition={isHovered ? {} : { delay: 2, duration: 4, repeat: Infinity, repeatDelay: 8 }}
        className="text-[10px] font-medium text-muted-foreground bg-card/80 px-2 py-1 rounded-full glass"
      >
        {isHovered ? "再点我一下~" : isSleepy ? "小人在睡觉..." : "我来陪你逛零食 ~"}
      </motion.span>
    </motion.div>
  );
}
