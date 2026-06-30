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

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

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
//
// Always use the same-origin proxy (/api/v1) so the browser never makes
// cross-origin requests. next.config.ts (dev) and vercel.json (prod) rewrite
// /api/* → <NEXT_PUBLIC_API_URL or Render>/api/* server-side.
//
// NEXT_PUBLIC_API_URL configures the rewrite destination only — not the
// axios base URL. Set it to http://localhost:8000 when running Django locally.
const BASE_URL = '/api/v1';

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

// ── Response interceptor — token refresh on 401 ──────────
//
// Strategy:
//   1. If a request returns 401, attempt one silent refresh using the
//      stored refresh token.
//   2. On success: store the new access token, replay the original request.
//   3. On failure (refresh also 401/expired): clear tokens so the user
//      gets sent to login.
//   We use a flag (_retry) on the config to prevent infinite loops.

let isRefreshing = false;
// Queue of { resolve, reject } for requests waiting on a refresh
type RefreshSubscriber = (token: string | null) => void;
const refreshSubscribers: RefreshSubscriber[] = [];

function subscribeTokenRefresh(cb: RefreshSubscriber) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers.length = 0;
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        return Promise.reject(normalizeError(error));
      }

      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (!newToken || !originalRequest) {
              reject(normalizeError(error));
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint directly (avoid interceptor loop)
        const { data } = await axios.post<{ access: string; refresh?: string }>(
          `${apiClient.defaults.baseURL}/users/auth/token/refresh/`,
          { refresh: refreshToken },
        );

        const newAccess = data.access;
        const newRefresh = data.refresh ?? refreshToken;
        setTokens(newAccess, newRefresh);

        onRefreshed(newAccess);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        onRefreshed(null);
        clearTokens();
        // Redirect to login only in browser context
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(normalizeError(error));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

export default apiClient;
