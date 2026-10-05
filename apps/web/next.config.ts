import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';
const config: NextConfig = {
  // Isolated validation builds opt in to emitted module attribution maps.
  productionBrowserSourceMaps: process.env.SPACE_BUILD_AUDIT === '1',
  // Friendly redirects must validate the original percent-encoded query.
  // Next's default Proxy URL normalization reconstructs decoded parameters.
  skipProxyUrlNormalize: true,
  // Next's dev client must connect before hydration. Allow this PC's exact
  // LAN addresses for phone testing, without a wildcard dev-origin allowance.
  allowedDevOrigins:
    process.env.NODE_ENV === 'development'
      ? Object.values(networkInterfaces()).flatMap((addresses) =>
          (addresses ?? [])
            .filter((address) => address.family === 'IPv4' && !address.internal)
            .map((address) => address.address),
        )
      : [],
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
        source: '/data/chunks/:version([a-f0-9]{64})/:file',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
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
