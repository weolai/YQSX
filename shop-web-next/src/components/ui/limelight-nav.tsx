"use client";

import { useState, useRef, useLayoutEffect, cloneElement, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  id: string;
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  href: string;
};

type LimelightNavProps = {
  items: NavItem[];
  className?: string;
  limelightClassName?: string;
};

export const LimelightNav = ({ items, className, limelightClassName }: LimelightNavProps) => {
  const pathname = usePathname();
  const activeIndex = items.findIndex((item) => item.href === pathname);
  const safeActiveIndex = activeIndex === -1 ? 0 : activeIndex;

  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (items.length === 0) return;

    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[safeActiveIndex];

    if (limelight && activeItem) {
      const newWidth = activeItem.offsetWidth;
      const newLeft = activeItem.offsetLeft;
      limelight.style.width = `${newWidth}px`;
      limelight.style.left = `${newLeft}px`;

      if (!isReady) {
        if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
        readyTimerRef.current = setTimeout(() => setIsReady(true), 50);
      }
    }
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    };
  }, [safeActiveIndex, isReady, items]);

  // Re-measure after fonts load
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.fonts.ready.then(() => {
      const limelight = limelightRef.current;
      const activeItem = navItemRefs.current[safeActiveIndex];
      if (limelight && activeItem) {
        const newWidth = activeItem.offsetWidth;
        const newLeft = activeItem.offsetLeft;
        limelight.style.width = `${newWidth}px`;
        limelight.style.left = `${newLeft}px`;
      }
    });
  }, [safeActiveIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        "relative inline-flex items-center h-12 sm:h-14 rounded-full glass px-1.5 sm:px-2 max-w-full overflow-hidden",
        className
      )}
    >
      {items.map(({ id, icon, label, href }, index) => (
        <Link
          key={id}
          href={href}
          ref={(el) => {
            navItemRefs.current[index] = el;
          }}
          className="relative z-20 flex h-full cursor-pointer items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 text-xs sm:text-sm font-medium transition-colors duration-200"
          aria-label={label}
        >
          {cloneElement(icon, {
            className: cn(
              "w-4 h-4 transition-all duration-200 shrink-0",
              safeActiveIndex === index ? "text-primary" : "text-muted-foreground"
            ),
          })}
          <span
            className={cn(
              "transition-colors duration-200 truncate max-w-[4.5rem] sm:max-w-none",
              safeActiveIndex === index ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </span>
        </Link>
      ))}

      <div
        ref={limelightRef}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-10 h-9 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(200,126,79,0.15)]",
          isReady ? "transition-[left,width] duration-300 ease-in-out" : "",
          limelightClassName
        )}
        style={{ left: "-999px", width: "48px" }}
      />
    </nav>
  );
};
