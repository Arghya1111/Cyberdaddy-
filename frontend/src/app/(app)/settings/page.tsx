'use client';

import { useState } from 'react';
import { Bell, Shield, Eye, Save, CheckCircle2, Loader2, AlertTriangle, X, AlertCircle } from 'lucide-react';
import { userService } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const SETTINGS_GROUPS = [
  {
    key: 'notifications',
    title: 'Notifications',
    icon: Bell,
    settings: [
      { key: 'threat_alerts', label: 'Threat Alerts', description: 'Get notified when threats are detected' },
      { key: 'family_alerts', label: 'Family Alerts', description: 'Receive alerts about family members' },
      { key: 'weekly_report', label: 'Weekly Report', description: 'Weekly security summary email' },
      { key: 'new_features', label: 'New Features', description: 'Updates about new CyberDaddy features' },
    ],
  },
  {
    key: 'security',
    title: 'Privacy & Security',
    icon: Shield,
    settings: [
      { key: 'login_alerts', label: 'Login Alerts', description: 'Alert on new device logins' },
      { key: 'data_sharing', label: 'Data Sharing', description: 'Help improve threat detection (anonymized)' },
    ],
  },
  {
    key: 'appearance',
    title: 'Appearance',
    icon: Eye,
    settings: [
      { key: 'compact_view', label: 'Compact View', description: 'Use a denser layout' },
    ],
  },
];

const DEFAULT_PREFS: Record<string, boolean> = {
  threat_alerts: true,
  family_alerts: true,
  weekly_report: false,
  new_features: false,
  login_alerts: true,
  data_sharing: true,
  compact_view: false,
};



// ─── Delete Account Confirmation Modal ───────────────────

function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await userService.deleteAccount();
      onDeleted();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-red-500/20 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-base font-bold text-white">Delete Account</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
          <p className="text-sm text-red-400/80 leading-relaxed">
            This action is <strong className="text-red-400">permanent</strong> and cannot be undone.
            All your scans, settings, and family data will be erased.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Type <span className="text-red-400">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-red-500/50 transition-all placeholder:text-white/20 font-mono"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading || confirm !== 'DELETE'}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => ({
    ...DEFAULT_PREFS,
    ...(user?.notification_preferences as Record<string, boolean> ?? {}),
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const toggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await userService.updateProfile({ notification_preferences: prefs });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-white/40">Configure your CyberDaddy experience</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:opacity-90 disabled:opacity-50'
          )}
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Settings</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {SETTINGS_GROUPS.map(({ key: groupKey, title, icon: Icon, settings }) => (
          <div key={groupKey} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">{title}</h2>
            </div>
            <div className="space-y-3">
              {settings.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{label}</div>
                    <div className="text-xs text-white/30">{description}</div>
                  </div>
                  <button
                    onClick={() => toggle(key)}
                    className={cn(
                      'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
                      prefs[key] ? 'bg-cyan-500' : 'bg-white/10'
                    )}
                    role="switch"
                    aria-checked={prefs[key]}
                    aria-label={label}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                        prefs[key] ? 'left-6' : 'left-1'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-colors text-left"
          >
            <div>
              <div className="text-sm font-medium text-red-400">Delete Account</div>
              <div className="text-xs text-white/30">Permanently delete your account and all data</div>
            </div>
            <AlertTriangle className="w-4 h-4 text-red-400/50" />
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={async () => {
            setShowDeleteModal(false);
            await logout();
          }}
        />
      )}
    </div>
  );
}
