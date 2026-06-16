import type { NextConfig } from 'next';

// Falls back to Render in CI/production; overridden by NEXT_PUBLIC_API_URL in .env.local.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://cyberdaddy.onrender.com';

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cyberdaddy.onrender.com',
      },
      {
        protocol: 'https',
        hostname: '*.ngrok-free.app',
      },
      {
        protocol: 'https',
        hostname: '*.ngrok-free.dev',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // ── CORS proxy ──────────────────────────────────────────
  // Rewrites /api/* from Next.js dev server → Django backend.
  // This avoids CORS preflight issues in production builds.
  // In local dev the axios client calls Django directly (CORS_ALLOW_ALL_ORIGINS=True).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },

  // ── Security headers ────────────────────────────────────
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
