'use client';

// ============================================================
// CyberDaddy — Profile Page
// Connects to GET/PATCH /api/v1/users/me/ and logout
// ============================================================

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userService, scanService, APIScanStats } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import ProfileCard from '@/components/profile/ProfileCard';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonProfile } from '@/components/ui/SkeletonLoader';
import {
  Edit2, Key, Bell, LogOut, X, Loader2, CheckCircle2, AlertCircle, ChevronRight, Save,
} from 'lucide-react';
import { UserProfile } from '@/types';

// ─── Map backend user to UserProfile type ─────────────────

function mapUserToProfile(
  user: {
    id: string;
    email: string;
    full_name: string;
    safety_score: number;
    account_type: string;
    account_status: string;
    date_joined: string;
    avatar?: string | null;
    is_email_verified: boolean;
  },
  stats?: APIScanStats | null,
): UserProfile {
  const planMap: Record<string, string> = {
    family_admin: 'Family',
    family_member: 'Family',
    enterprise: 'Enterprise',
    individual: 'Free',
  };
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    safetyScore: Math.round(user.safety_score ?? 0),
    subscription: (planMap[user.account_type] ?? 'Free') as 'Free' | 'Pro' | 'Family' | 'Enterprise',
    accountStatus: (user.account_status === 'active' || user.account_status === 'suspended' || user.account_status === 'trial')
      ? user.account_status as 'active' | 'suspended' | 'trial'
      : 'active',
    protectedSince: new Date(user.date_joined || Date.now()),
    totalScans: stats?.total_scans ?? 0,
    threatsBlocked: stats?.threats_detected ?? 0,
    avatar: user.avatar ?? undefined,
  };
}

// ─── Edit Profile Modal ───────────────────────────────────

function EditProfileModal({
  currentName,
  onClose,
  onSaved,
}: {
  currentName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await userService.updateProfile({ full_name: name.trim() });
      onSaved(name.trim());
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await userService.changePassword(form);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Change Password</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {success ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-white font-semibold">Password changed successfully!</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              {(['current_password', 'new_password', 'confirm_password'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    {field.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="password"
                    name={field}
                    value={form[field]}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Update Password
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Notification Preferences Modal ──────────────────────

const NOTIF_PREFS = [
  { key: 'threat_alerts', label: 'Threat Alerts', description: 'Get notified when threats are detected' },
  { key: 'family_alerts', label: 'Family Alerts', description: 'Receive alerts about family members' },
  { key: 'weekly_report', label: 'Weekly Report', description: 'Weekly security summary email' },
  { key: 'new_features', label: 'New Features', description: 'Updates about new features' },
  { key: 'login_alerts', label: 'Login Alerts', description: 'Alert on new device logins' },
];

function NotificationPrefsModal({
  currentPrefs,
  onClose,
  onSaved,
}: {
  currentPrefs: Record<string, boolean>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    threat_alerts: true,
    family_alerts: true,
    weekly_report: false,
    new_features: false,
    login_alerts: true,
    ...currentPrefs,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await userService.updateProfile({ notification_preferences: prefs });
      onSaved();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Notification Preferences</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-3 mb-5">
          {NOTIF_PREFS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
              <div>
                <div className="text-sm text-white font-medium">{label}</div>
                <div className="text-xs text-white/30">{description}</div>
              </div>
              <button
                onClick={() => toggle(key)}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${prefs[key] ? 'bg-cyan-500' : 'bg-white/10'}`}
                role="switch"
                aria-checked={prefs[key]}
                aria-label={label}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${prefs[key] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout, refreshUser } = useAuth();
  const [modal, setModal] = useState<'edit' | 'password' | 'notifications' | null>(null);

  const fetchStats = useCallback(() => scanService.getScanStats(), []);
  const { data: scanStats } = useApi<APIScanStats>(fetchStats);

  const handleNameSaved = useCallback(async () => {
    setModal(null);
    await refreshUser();
  }, [refreshUser]);

  const isLoading = authLoading;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-5 lg:p-6">
        <div className="mb-6">
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonProfile />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState error={null} message="User not found. Please log in again." />
      </div>
    );
  }

  const profile = mapUserToProfile(user, scanStats);

  const SETTINGS_SECTIONS = [
    { icon: Edit2, label: 'Edit Profile', description: 'Update your name and avatar', color: 'text-cyan-400', action: () => setModal('edit') },
    { icon: Key, label: 'Change Password', description: 'Update your account password', color: 'text-emerald-400', action: () => setModal('password') },
    { icon: Bell, label: 'Notification Preferences', description: 'Manage alerts and settings', color: 'text-yellow-400', action: () => setModal('notifications') },
    { icon: LogOut, label: 'Sign Out', description: 'Sign out of your CyberDaddy account', color: 'text-red-400', action: logout },
  ];

  return (
    <div
      className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      <div>
        <h1 className="text-xl font-bold text-white">My Profile</h1>
        <p className="text-sm text-white/40">Manage your account and security settings</p>
      </div>

      {/* Email verification banner */}
      {!user.is_email_verified && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-400">Verify your email address</p>
            <p className="text-xs text-yellow-400/70 mt-0.5">Some features require email verification. Check your inbox.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <ProfileCard profile={profile} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Account</h2>
          {SETTINGS_SECTIONS.map(({ icon: Icon, label, description, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all duration-200 text-left group"
            >
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-white/30">{description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      {modal === 'edit' && (
        <EditProfileModal
          currentName={user.full_name}
          onClose={() => setModal(null)}
          onSaved={handleNameSaved}
        />
      )}
      {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === 'notifications' && (
        <NotificationPrefsModal
          currentPrefs={(user.notification_preferences as Record<string, boolean>) ?? {}}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await refreshUser(); }}
        />
      )}
    </div>
  );
}
