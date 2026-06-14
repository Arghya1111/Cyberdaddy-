'use client';

// ============================================================
// CyberDaddy — Auth Context
// Provides authentication state and actions to the entire app.
// ============================================================

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import {
  getAccessToken, getRefreshToken, getStoredUser, setTokens, setStoredUser,
  clearTokens, isAuthenticated as checkIsAuthenticated, StoredUser,
} from '@/lib/auth';
import { authService, userService, APIUser } from '@/lib/apiServices';
import { APIError, normalizeError } from '@/lib/api';

// ─── Context Types ────────────────────────────────────────

interface AuthContextValue {
  user: APIUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    full_name: string;
    phone_number?: string;
    password: string;
    confirm_password: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<APIUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);

  // ── Initialize session on mount ───────────────────────────
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const initialize = async () => {
      const token = getAccessToken();
      if (!token || !checkIsAuthenticated()) {
        setIsLoading(false);
        return;
      }

      // Try to get user from storage first (instant)
      const storedUser = getStoredUser();
      if (storedUser) {
        // Convert StoredUser to APIUser shape (best-effort)
        setUser({
          id: storedUser.id,
          email: storedUser.email,
          full_name: storedUser.full_name,
          account_type: storedUser.account_type,
          account_status: storedUser.account_status as 'active' | 'suspended' | 'trial',
          is_email_verified: storedUser.is_email_verified,
          is_phone_verified: false,
          safety_score: storedUser.safety_score,
          avatar: storedUser.avatar ?? null,
          timezone: 'UTC',
          language: 'en',
          notification_preferences: {},
          date_joined: '',
          last_login: '',
        });
      }

      // Always refresh from API in background
      try {
        const freshUser = await userService.getProfile();
        setUser(freshUser);
        setStoredUser({
          id: freshUser.id,
          email: freshUser.email,
          full_name: freshUser.full_name,
          account_type: freshUser.account_type,
          account_status: freshUser.account_status,
          is_email_verified: freshUser.is_email_verified,
          safety_score: freshUser.safety_score,
          avatar: freshUser.avatar,
        });
      } catch {
        // If fetch fails but we have stored user, keep them logged in
        if (!storedUser) {
          clearTokens();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setTokens(response.access, response.refresh);
    setUser(response.user);
    setStoredUser({
      id: response.user.id,
      email: response.user.email,
      full_name: response.user.full_name,
      account_type: response.user.account_type,
      account_status: response.user.account_status,
      is_email_verified: response.user.is_email_verified,
      safety_score: response.user.safety_score,
      avatar: response.user.avatar,
    });
  }, []);

  // ── Register ───────────────────────────────────────────────
  const register = useCallback(async (payload: {
    email: string;
    full_name: string;
    phone_number?: string;
    password: string;
    confirm_password: string;
  }) => {
    const result = await authService.register(payload);
    return { success: result.success, message: result.message };
  }, []);

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Swallow errors — clear local state regardless
    }
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  }, []);

  // ── Refresh user profile ───────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await userService.getProfile();
      setUser(freshUser);
      setStoredUser({
        id: freshUser.id,
        email: freshUser.email,
        full_name: freshUser.full_name,
        account_type: freshUser.account_type,
        account_status: freshUser.account_status,
        is_email_verified: freshUser.is_email_verified,
        safety_score: freshUser.safety_score,
        avatar: freshUser.avatar,
      });
    } catch {
      // Ignore refresh failures
    }
  }, []);

  const isAuthenticated = !!user && checkIsAuthenticated();

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
