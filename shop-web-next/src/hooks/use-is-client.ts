import { useSyncExternalStore } from "react";

/**
 * 判断当前是否在客户端（浏览器）环境
 * 用于避免 SSR 水合不匹配
 */
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
