import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  assetPrefix: '/admin',
  experimental: { serverActions: { allowedOrigins: ['radas.my', 'www.radas.my'] } },
  async rewrites() {
    return [
      { source: '/admin/api/:path*', destination: '/api/:path*' },
      { source: '/admin/_next/:path*', destination: '/_next/:path*' },
      { source: '/sales-assets/:path*', destination: '/assets/:path*' }
    ];
  }
};
export default nextConfig;
