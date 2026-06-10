'use client';

import { UserProfile } from '@/types';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ShieldCheck, Star, Mail, Calendar, Scan, ShieldOff } from 'lucide-react';

interface ProfileCardProps {
  profile: UserProfile;
}

const STATUS_CONFIG = {
  active: { label: 'Active', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  suspended: { label: 'Suspended', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
  trial: { label: 'Trial', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const SUB_COLORS: Record<string, string> = {
  Free: 'from-white/20 to-white/10',
  Pro: 'from-cyan-600 to-blue-700',
  Family: 'from-emerald-500 to-cyan-600',
  Enterprise: 'from-purple-600 to-pink-600',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const status = STATUS_CONFIG[profile.accountStatus];
  const scoreColor =
    profile.safetyScore >= 80 ? 'text-emerald-400' :
    profile.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Main profile card */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className={cn(
            'w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-xl',
            SUB_COLORS[profile.subscription]
          )}>
            {getInitials(profile.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white">{profile.name}</h2>
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', status.class)}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-3.5 h-3.5 text-white/30" />
              <span className="text-sm text-white/40">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs text-white/30">Protected since {formatDate(profile.protectedSince)}</span>
            </div>

            {/* Subscription badge */}
            <div className={cn(
              'inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-gradient-to-r text-white text-xs font-bold shadow-lg',
              SUB_COLORS[profile.subscription]
            )}>
              <Star className="w-3 h-3" />
              {profile.subscription} Plan
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm hover:bg-white/8 transition-colors">
          <div className={cn('text-2xl font-black tabular-nums', scoreColor)}>{profile.safetyScore}</div>
          <div className="text-[10px] text-white/30 mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Safety Score
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm hover:bg-white/8 transition-colors">
          <div className="text-2xl font-black text-cyan-400 tabular-nums">{profile.totalScans}</div>
          <div className="text-[10px] text-white/30 mt-1 flex items-center justify-center gap-1">
            <Scan className="w-3 h-3" />
            Total Scans
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm hover:bg-white/8 transition-colors">
          <div className="text-2xl font-black text-red-400 tabular-nums">{profile.threatsBlocked}</div>
          <div className="text-[10px] text-white/30 mt-1 flex items-center justify-center gap-1">
            <ShieldOff className="w-3 h-3" />
            Blocked
          </div>
        </div>
      </div>
    </div>
  );
}
