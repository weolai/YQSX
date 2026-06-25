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
        source: '/api/din/users/:path*',
        destination: 'http://127.0.0.1:8000/api/recommend/users/:path*',
      },
      {
        source: '/api/din/topk',
        destination: 'http://127.0.0.1:8000/api/recommend/topk',
      },
      {
        source: '/api/din/recommend',
        destination: 'http://127.0.0.1:8000/api/recommend',
      },
      {
        source: '/api/din/:path*',
        destination: 'http://127.0.0.1:8000/api/recommend/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
