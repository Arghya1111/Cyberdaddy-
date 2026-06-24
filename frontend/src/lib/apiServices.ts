// ============================================================
// CyberDaddy — API Service Wrappers
//
// All service functions call the Django REST API through the
// shared axios client in @/lib/api.
//
// Endpoint reference (base: /api/v1/):
//   users/  → auth, profile, password
//   scans/  → scan submission, history, stats
//   insights/ → dashboard, trends
//   family/ → group, members, invite
//   notifications/ → list, unread count, mark read
// ============================================================

import apiClient from './api';

// ─── Utility ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── User / Auth Types ────────────────────────────────────

export interface APIUser {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  account_type: 'individual' | 'family_admin' | 'family_member' | 'enterprise';
  account_status: 'active' | 'suspended' | 'trial';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  safety_score: number;
  avatar: string | null;
  timezone: string;
  language: string;
  notification_preferences: Record<string, boolean>;
  date_joined: string;
  last_login: string;
}

export interface APILoginResponse {
  access: string;
  refresh: string;
  user: APIUser;
}

export interface APIRegisterResponse {
  success: boolean;
  message: string;
  user?: { id: string; email: string };
}

// ─── Auth Service ─────────────────────────────────────────

export interface APIVerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface APIResendVerificationResponse {
  success: boolean;
  message: string;
}

export const authService = {
  async login(email: string, password: string): Promise<APILoginResponse> {
    const { data } = await apiClient.post<APILoginResponse>('/users/auth/login/', { email, password });
    return data;
  },

  async register(payload: {
    email: string;
    full_name: string;
    phone_number?: string;
    password: string;
    confirm_password: string;
  }): Promise<APIRegisterResponse> {
    const { data } = await apiClient.post<APIRegisterResponse>('/users/auth/register/', payload);
    return data;
  },

  async logout(refresh: string): Promise<void> {
    // Backend LogoutSerializer expects { refresh_token }, not { refresh }
    await apiClient.post('/users/auth/logout/', { refresh_token: refresh });
  },

  /** Verify email using the token from the verification link URL. */
  async verifyEmail(token: string): Promise<APIVerifyEmailResponse> {
    const { data } = await apiClient.get<APIVerifyEmailResponse>(`/users/verify-email/${token}/`);
    return data;
  },

  /** Resend verification email to the given address (no auth required). */
  async resendVerificationEmail(email: string): Promise<APIResendVerificationResponse> {
    const { data } = await apiClient.post<APIResendVerificationResponse>(
      '/users/auth/resend-verification/',
      { email },
    );
    return data;
  },

  /** Request a password-reset email (no auth required).
   *  Backend: POST /users/auth/forgot-password/ */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/users/auth/forgot-password/',
      { email },
    );
    return data;
  },

  /** Confirm password reset with the token from the email link.
   *  Backend: POST /users/auth/reset-password/
   *  Payload: { token, new_password, confirm_password } */
  async confirmPasswordReset(payload: {
    token: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/users/auth/reset-password/',
      payload,
    );
    return data;
  },

  /** Refresh an access token using a refresh token (no auth header needed).
   *  Backend: POST /users/auth/token/refresh/ */
  async refreshAccessToken(refresh: string): Promise<{ access: string }> {
    const { data } = await apiClient.post<{ access: string }>(
      '/users/auth/token/refresh/',
      { refresh },
    );
    return data;
  },
};

// ─── User Service ─────────────────────────────────────────

export const userService = {
  async getProfile(): Promise<APIUser> {
    const { data } = await apiClient.get<APIUser>('/users/me/');
    return data;
  },

  async updateProfile(payload: {
    full_name?: string;
    phone_number?: string;
    timezone?: string;
    language?: string;
    notification_preferences?: Record<string, boolean>;
  }): Promise<APIUser> {
    const { data } = await apiClient.patch<APIUser>('/users/me/', payload);
    return data;
  },

  async changePassword(payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<void> {
    // Backend path: /users/change-password/ (NOT /users/me/change-password/)
    await apiClient.post('/users/change-password/', payload);
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me/');
  },
};

// ─── Scan Types ───────────────────────────────────────────

export interface APIScanListItem {
  id: string;
  scan_type: 'screenshot' | 'sms' | 'url' | 'email' | 'phone_number';
  /** Backend status values: pending → processing → completed | failed */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical' | null;
  risk_score: number | null;
  is_threat: boolean;
  scam_category: string | null;
  ai_summary: string | null;
  /** Raw text that was scanned (SMS, email, phone) */
  scan_input_text?: string | null;
  /** URL that was scanned */
  scan_input_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface APIScanStats {
  total_scans: number;
  threats_detected: number;
  average_risk_score: number;
  remaining_scans: number;
  scans_this_month: number;
}

export interface APIScanSubmitResponse {
  scan_id: string;
  status: string;
  risk_level?: string;
  risk_score?: number;
  ai_summary?: string;
}

// ─── Scan Service ─────────────────────────────────────────

export const scanService = {
  async submitScreenshotScan(file: File): Promise<APIScanSubmitResponse> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await apiClient.post<APIScanSubmitResponse>('/scans/screenshot/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async submitTextScan(payload: {
    scan_type: 'sms' | 'url' | 'email' | 'phone_number';
    content: string;
  }): Promise<APIScanSubmitResponse> {
    const { data } = await apiClient.post<APIScanSubmitResponse>('/scans/text/', payload);
    return data;
  },

  async getScanHistory(params?: {
    page?: number;
    page_size?: number;
    scan_type?: string;
    risk_level?: string;
    search?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<APIScanListItem>> {
    const { data } = await apiClient.get<PaginatedResponse<APIScanListItem>>('/scans/history/', { params });
    return data;
  },

  async getScanStats(): Promise<APIScanStats> {
    const { data } = await apiClient.get<APIScanStats>('/scans/stats/');
    return data;
  },
};

// ─── Insight Types ────────────────────────────────────────

export interface APISafetyTrendPoint {
  date: string;
  score: number;
  threats: number;
}

export interface APIInsightDashboard {
  safety_score: number;
  safety_score_trend: number;
  risk_profile: string;
  total_scans: number;
  total_threats_detected: number;
  ai_narrative: string | null;
  recommendations: string[];
  monthly_safety_trend: APISafetyTrendPoint[];
}

// ─── Insight Service ──────────────────────────────────────

export const insightService = {
  async getDashboard(): Promise<APIInsightDashboard> {
    const { data } = await apiClient.get<APIInsightDashboard>('/insights/dashboard/');
    return data;
  },
};

// ─── Family Types ─────────────────────────────────────────

export interface APIFamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface APIFamilyMember {
  id: string;
  role: 'parent' | 'child' | 'guardian' | 'member';
  user: {
    id: string;
    email: string;
    full_name: string;
    safety_score: number;
    avatar?: string | null;
  } | null;
  joined_at: string;
}

export interface APIFamilyDashboard {
  group: APIFamilyGroup | null;
  members: APIFamilyMember[];
  average_safety_score: number;
  total_scans_this_month: number;
  threats_this_month: number;
}

// ─── Family Service ───────────────────────────────────────

export const familyService = {
  async getDashboard(): Promise<APIFamilyDashboard> {
    const { data } = await apiClient.get<APIFamilyDashboard>('/family/dashboard/');
    return data;
  },

  async getMembers(): Promise<APIFamilyMember[]> {
    const { data } = await apiClient.get<APIFamilyMember[]>('/family/members/');
    return data;
  },

  async joinFamily(invite_code: string): Promise<void> {
    await apiClient.post('/family/join/', { invite_code });
  },

  async createFamily(name: string): Promise<APIFamilyGroup> {
    const { data } = await apiClient.post<APIFamilyGroup>('/family/create/', { name });
    return data;
  },

  async removeMember(memberId: string): Promise<void> {
    // Backend path: /family/members/<uuid>/remove/ (NOT /family/members/<uuid>/)
    await apiClient.delete(`/family/members/${memberId}/remove/`);
  },

  async regenerateInviteCode(): Promise<{ invite_code: string }> {
    // Backend path: /family/invite/regenerate/ (NOT /family/regenerate-invite/)
    const { data } = await apiClient.post<{ invite_code: string; expires_at: string; success: boolean }>(
      '/family/invite/regenerate/',
    );
    return { invite_code: data.invite_code };
  },

  async sendInviteEmail(email: string): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/family/invite/send/',
      { email },
    );
    return data;
  },
};

// ─── Notification Types ───────────────────────────────────

export interface APINotification {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'unread' | 'read' | 'archived';
  created_at: string;
}

export interface APIUnreadCountResponse {
  count: number;
}

// ─── Notification Service ─────────────────────────────────

export const notificationService = {
  async getUnreadCount(): Promise<number> {
    const { data } = await apiClient.get<APIUnreadCountResponse>('/notifications/unread-count/');
    return data.count;
  },

  async list(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<APINotification>> {
    const { data } = await apiClient.get<PaginatedResponse<APINotification>>('/notifications/', { params });
    return data;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read/`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read/');
  },
};
