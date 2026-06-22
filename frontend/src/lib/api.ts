// ============================================================
// CyberDaddy — Axios HTTP Client
//
// Strategy:
//   - In production (Vercel): all /api/* requests are proxied
//     to the Django backend via next.config.ts rewrites, so
//     we use a relative base URL to avoid CORS entirely.
//   - NEXT_PUBLIC_API_URL can override this for local dev or
//     if you want to hit the backend directly.
// ============================================================

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { getAccessToken, clearTokens } from './auth';

// ─── APIError ─────────────────────────────────────────────

export class APIError extends Error {
  status: number | undefined;
  data: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// ─── normalizeError ───────────────────────────────────────

export function normalizeError(err: unknown): APIError {
  if (err instanceof APIError) return err;

  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{
      detail?: string;
      message?: string;
      non_field_errors?: string[];
      // Nested error shape used by family/scam endpoints: { success: false, error: { message: "..." } }
      error?: { message?: string };
      success?: boolean;
    }>;
    const status = axiosErr.response?.status;
    const responseData = axiosErr.response?.data;

    let message = 'An unexpected error occurred.';
    if (responseData?.detail) {
      message = responseData.detail;
    } else if (responseData?.error?.message) {
      message = responseData.error.message;
    } else if (responseData?.message) {
      message = responseData.message;
    } else if (responseData?.non_field_errors?.length) {
      message = responseData.non_field_errors[0];
    } else if (axiosErr.message) {
      message = axiosErr.message;
    }

    return new APIError(message, status, responseData);
  }

  if (err instanceof Error) {
    return new APIError(err.message);
  }

  return new APIError('An unexpected error occurred.');
}

// ─── Axios instance ───────────────────────────────────────

// In production (Vercel) always use the Next.js proxy so the browser
// never makes a cross-origin request and CORS is not needed.
// next.config.ts rewrites  /api/:path*  →  <backend>/api/:path*
// (the backend destination is configured via NEXT_PUBLIC_API_URL there).
//
// In local development, NEXT_PUBLIC_API_URL can be set to call the
// local Django server directly (e.g. http://localhost:8000) without
// needing the proxy, because local.py sets CORS_ALLOW_ALL_ORIGINS=True.
const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? '/api/v1'
    : process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : '/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach JWT ─────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — normalise errors ───────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local session
      clearTokens();
    }
    return Promise.reject(normalizeError(error));
  }
);

export default apiClient;
