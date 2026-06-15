// ============================================================
// CyberDaddy — Centralized Configuration
// ============================================================

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'CyberDaddy',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY ?? '',
} as const;
