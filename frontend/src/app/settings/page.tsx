import type { Metadata } from 'next';
import {
  Bell, Shield, Eye, Globe, Smartphone,
  Lock, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Settings — CyberDaddy',
  description: 'Configure your CyberDaddy security preferences and notification settings.',
};

const SETTINGS_GROUPS = [
  {
    title: 'Notifications',
    icon: Bell,
    settings: [
      { label: 'Threat Alerts', description: 'Get notified when threats are detected', enabled: true },
      { label: 'Family Alerts', description: 'Receive alerts about family members', enabled: true },
      { label: 'Weekly Report', description: 'Weekly security summary email', enabled: false },
      { label: 'New Features', description: 'Updates about new CyberDaddy features', enabled: false },
    ],
  },
  {
    title: 'Privacy & Security',
    icon: Shield,
    settings: [
      { label: 'Two-Factor Authentication', description: 'Require 2FA on login', enabled: false },
      { label: 'Login Alerts', description: 'Alert on new device logins', enabled: true },
      { label: 'Data Sharing', description: 'Help improve threat detection (anonymized)', enabled: true },
    ],
  },
  {
    title: 'Appearance',
    icon: Eye,
    settings: [
      { label: 'Dark Mode', description: 'Always use dark cybersecurity theme', enabled: true },
      { label: 'Compact View', description: 'Use a denser layout', enabled: false },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40">Configure your CyberDaddy experience</p>
      </div>

      <div className="space-y-4">
        {SETTINGS_GROUPS.map(({ title, icon: Icon, settings }) => (
          <div key={title} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">{title}</h2>
            </div>
            <div className="space-y-3">
              {settings.map(({ label, description, enabled }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{label}</div>
                    <div className="text-xs text-white/30">{description}</div>
                  </div>
                  {/* Toggle (UI only for MVP) */}
                  <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer ${enabled ? 'bg-cyan-500' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${enabled ? 'left-6' : 'left-1'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-colors text-left">
              <div>
                <div className="text-sm font-medium text-red-400">Delete Account</div>
                <div className="text-xs text-white/30">Permanently delete your account and all data</div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
