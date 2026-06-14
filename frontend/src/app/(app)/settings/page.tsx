'use client';

import { useState } from 'react';
import { Bell, Shield, Eye, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { userService } from '@/lib/apiServices';
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



export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => ({
    ...DEFAULT_PREFS,
    ...(user?.notification_preferences as Record<string, boolean> ?? {}),
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <button className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-colors text-left">
            <div>
              <div className="text-sm font-medium text-red-400">Delete Account</div>
              <div className="text-xs text-white/30">Permanently delete your account and all data</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
