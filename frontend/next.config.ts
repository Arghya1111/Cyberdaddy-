import type { NextConfig } from 'next';

// ── Backend URL ───────────────────────────────────────────────────────────────
// NEXT_PUBLIC_API_URL controls where the Next.js proxy sends /api/* requests.
// It is evaluated at BUILD TIME on Vercel — never at runtime in the browser.
//
// Production (Vercel deploy): leave NEXT_PUBLIC_API_URL unset (or set it to
//   https://cyberdaddy.onrender.com in the Vercel project settings).
//   The browser always calls /api/v1/* → Vercel edge rewrites → Django.
//   No CORS headers are needed because the browser sees only the Vercel origin.
//
// Local dev: set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local.
//   api.ts will call Django directly; local.py sets CORS_ALLOW_ALL_ORIGINS=True.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://cyberdaddy.onrender.com';

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cyberdaddy.onrender.com' },
      { protocol: 'https', hostname: 'cyberdaddy-api.onrender.com' },
      { protocol: 'https', hostname: '*.ngrok-free.app' },
      { protocol: 'https', hostname: '*.ngrok-free.dev' },
      { protocol: 'http',  hostname: '127.0.0.1' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },

  // ── Server-side CORS proxy ────────────────────────────────────────────────
  // All browser API calls use relative URLs (/api/v1/*).
  // Vercel's edge network rewrites them to the Django backend server-side,
  // so the browser never makes a cross-origin request — no CORS needed.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },

  // ── Security headers ──────────────────────────────────────────────────────
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
