import type { NextConfig } from 'next';
const config: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
  transpilePackages: [
    '@space/domain',
    '@space/astro',
    '@space/engine',
    '@space/db',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};
export default config;
