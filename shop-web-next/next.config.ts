import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 配置图片域名白名单
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/api/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8081',
        pathname: '/**',
      },
    ],
  },
  
  // 配置 API 代理（开发环境）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
