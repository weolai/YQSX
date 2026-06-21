"use client";

import { useEffect } from "react";

/**
 * 过滤 Next.js RSC 预取/导航被浏览器取消时产生的噪声日志。
 * 这些 `net::ERR_ABORTED` 错误属于正常的请求取消，不影响功能。
 */
export function ConsoleErrorFilter() {
  useEffect(() => {
    const originalError = console.error;

    console.error = (...args: unknown[]) => {
      if (isRscAbortError(args)) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}

function isRscAbortError(args: unknown[]): boolean {
  if (args.length === 0) return false;

  const first = String(args[0]);
  const message = args.map((arg) => String(arg)).join(" ");

  // Next.js RSC 请求取消特征：net::ERR_ABORTED 且 URL 包含 _rsc=
  return (
    first.includes("net::ERR_ABORTED") && message.includes("_rsc=")
  );
}
