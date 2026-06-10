import type { Metadata } from 'next';
import ProfileCard from '@/components/profile/ProfileCard';
import { mockUserProfile } from '@/features/profile/mockData';
import { Edit2, Key, Bell, LogOut } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Profile — CyberDaddy',
  description: 'View and manage your CyberDaddy profile, security settings, and subscription.',
};

const SETTINGS_SECTIONS = [
  {
    icon: Edit2,
    label: 'Edit Profile',
    description: 'Update your name, email, and avatar',
    color: 'text-cyan-400',
  },
  {
    icon: Key,
    label: 'Change Password',
    description: 'Update your account password',
    color: 'text-emerald-400',
  },
  {
    icon: Bell,
    label: 'Notification Preferences',
    description: 'Manage alerts and notification settings',
    color: 'text-yellow-400',
  },
  {
    icon: LogOut,
    label: 'Sign Out',
    description: 'Sign out of your CyberDaddy account',
    color: 'text-red-400',
  },
];

export default function ProfilePage() {
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div>
        <h1 className="text-xl font-bold text-white">My Profile</h1>
        <p className="text-sm text-white/40">Manage your account and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <ProfileCard profile={mockUserProfile} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Account</h2>
          {SETTINGS_SECTIONS.map(({ icon: Icon, label, description, color }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all duration-200 text-left group"
            >
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-white/30">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
