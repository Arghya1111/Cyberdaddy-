import type { NextConfig } from 'next';

// NEXT_PUBLIC_API_URL is read by src/app/api/v1/[...path]/route.ts at runtime.

const nextConfig: NextConfig = {
  // Django API routes require trailing slashes. Next.js otherwise 308-redirects
  // /api/.../  →  /api/... before route handlers run, breaking POST proxy requests.
  skipTrailingSlashRedirect: true,

  images: {
    dangerouslyAllowSVG: true,
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cyberdaddy.onrender.com' },
      { protocol: 'https', hostname: 'cyberdaddy-api.onrender.com' },
      { protocol: 'https', hostname: '*.ngrok-free.app' },
      { protocol: 'https', hostname: '*.ngrok-free.dev' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

  // API proxy is handled by src/app/api/v1/[...path]/route.ts (server-side fetch).
  // Do not add rewrites here — Next.js trailing-slash redirects break Django POST requests.

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
