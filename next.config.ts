import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  // Fix for coze-coding-dev-sdk compatibility
  serverExternalPackages: ['coze-coding-dev-sdk'],
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {},
};

export default nextConfig;
