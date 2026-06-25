import { useSyncExternalStore } from "react";

/**
 * 检测用户是否启用了「减少动画」系统偏好
 * 用于可访问性优化
 */
export function useReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}
