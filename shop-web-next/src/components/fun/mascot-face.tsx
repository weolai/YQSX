"use client";

import { motion, type MotionValue } from "framer-motion";

export type Mood = "idle" | "happy" | "wink" | "surprised" | "love";

interface MascotFaceProps {
  mood: Mood;
  isSleepy: boolean;
  eyeX: MotionValue<number>;
  eyeY: MotionValue<number>;
}

/**
 * 吉祥物 SVG 表情渲染组件。
 * 根据 mood 渲染不同表情；idle 状态下眼球跟随鼠标（eyeX/eyeY）。
 */
export function MascotFace({ mood, isSleepy, eyeX, eyeY }: MascotFaceProps) {
  switch (mood) {
    case "happy":
      return (
        <g>
          <rect x="16" y="18" width="6" height="6" rx="1" fill="#2A2118" />
          <rect x="34" y="18" width="6" height="6" rx="1" fill="#2A2118" />
          <rect x="20" y="28" width="16" height="4" fill="#2A2118" />
          <rect x="18" y="26" width="4" height="4" fill="#2A2118" />
          <rect x="34" y="26" width="4" height="4" fill="#2A2118" />
        </g>
      );
    case "wink":
      return (
        <g>
          <rect x="16" y="20" width="6" height="4" rx="1" fill="#2A2118" />
          <rect x="34" y="18" width="6" height="6" rx="1" fill="#2A2118" />
          <rect x="20" y="30" width="16" height="2" fill="#2A2118" />
        </g>
      );
    case "surprised":
      return (
        <g>
          <rect x="15" y="18" width="8" height="8" rx="2" fill="#2A2118" />
          <rect x="33" y="18" width="8" height="8" rx="2" fill="#2A2118" />
          <rect x="26" y="30" width="4" height="6" rx="1" fill="#2A2118" />
        </g>
      );
    case "love":
      return (
        <g>
          <rect x="15" y="18" width="8" height="8" fill="#e8566e" />
          <rect x="33" y="18" width="8" height="8" fill="#e8566e" />
          <rect x="20" y="30" width="16" height="2" fill="#2A2118" />
        </g>
      );
    default:
      return isSleepy ? (
        <g>
          <rect x="16" y="22" width="8" height="2" rx="1" fill="#2A2118" />
          <rect x="34" y="22" width="8" height="2" rx="1" fill="#2A2118" />
          <rect x="24" y="32" width="8" height="2" fill="#2A2118" />
        </g>
      ) : (
        <g>
          <motion.g style={{ x: eyeX, y: eyeY }}>
            <rect x="16" y="18" width="6" height="6" rx="1" fill="#2A2118" />
            <rect x="34" y="18" width="6" height="6" rx="1" fill="#2A2118" />
            <rect x="18" y="19" width="2" height="2" fill="white" />
            <rect x="36" y="19" width="2" height="2" fill="white" />
          </motion.g>
          <rect x="22" y="30" width="12" height="2" fill="#2A2118" />
        </g>
      );
  }
}
