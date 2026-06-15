// ============================================================
// CyberDaddy — Client-side Auth Token Storage
// All tokens are stored in localStorage (no HttpOnly cookies
// in this MVP; upgrade to HttpOnly cookies for production).
// ============================================================

const ACCESS_TOKEN_KEY = 'cd_access_token';
const REFRESH_TOKEN_KEY = 'cd_refresh_token';
const USER_KEY = 'cd_user';

export interface StoredUser {
  id: string;
  email: string;
  full_name: string;
  account_type: 'individual' | 'family_admin' | 'family_member' | 'enterprise';
  account_status: 'active' | 'suspended' | 'trial';
  is_email_verified: boolean;
  safety_score: number;
  avatar?: string | null;
}

// ─── Token getters / setters ─────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── User getters / setters ──────────────────────────────

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ─── Auth check ──────────────────────────────────────────

/**
 * Returns true if a non-expired access token exists in storage.
 * Note: this is a lightweight check — it does NOT verify the JWT signature.
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    // exp is in seconds
    return decoded.exp * 1000 > Date.now();
  } catch {
    // Malformed token — treat as unauthenticated
    return !!token;
  }
}
