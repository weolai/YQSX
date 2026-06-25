"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  children: string;
  as?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
  duration?: number;
  spread?: number;
};

function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);

  return (
    <Component
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--base-color:hsl(25_10%_60%)] [--base-gradient-color:hsl(25_30%_13%)]",
        "dark:[--base-color:hsl(30_10%_50%)] dark:[--base-gradient-color:hsl(30_30%_96%)]",
        className
      )}
      style={{
        "--spread": `${dynamicSpread}px`,
        backgroundImage:
          "linear-gradient(90deg, transparent calc(50% - var(--spread)), var(--base-gradient-color), transparent calc(50% + var(--spread))), linear-gradient(var(--base-color), var(--base-color))",
      } as React.CSSProperties}
    >
      <motion.span
        className="block"
        initial={{ backgroundPosition: "100% center" }}
        animate={{ backgroundPosition: "0% center" }}
        transition={{
          repeat: Infinity,
          duration,
          ease: "linear",
        }}
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent calc(50% - var(--spread)), var(--base-gradient-color), transparent calc(50% + var(--spread)))",
          backgroundSize: "250% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {children}
      </motion.span>
    </Component>
  );
}

export const TextShimmer = React.memo(TextShimmerComponent);
