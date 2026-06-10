'use client';

import { FamilyMember } from '@/types';
import { cn } from '@/lib/utils';
import { Smartphone, ShieldCheck, ShieldAlert, WifiOff } from 'lucide-react';

interface FamilyMemberCardProps {
  member: FamilyMember;
}

const STATUS_CONFIG = {
  protected: {
    label: 'Protected',
    icon: ShieldCheck,
    class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  'at-risk': {
    label: 'At Risk',
    icon: ShieldAlert,
    class: 'text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-400 animate-pulse',
  },
  offline: {
    label: 'Offline',
    icon: WifiOff,
    class: 'text-white/40 bg-white/5 border-white/10',
    dot: 'bg-white/20',
  },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-emerald-500 to-teal-600',
];

export default function FamilyMemberCard({ member }: FamilyMemberCardProps) {
  const status = STATUS_CONFIG[member.protectionStatus];
  const StatusIcon = status.icon;
  const colorIdx = parseInt(member.id) % AVATAR_COLORS.length;

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200 hover:bg-white/8 backdrop-blur-sm group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shadow-lg',
            AVATAR_COLORS[colorIdx]
          )}>
            {getInitials(member.name)}
          </div>
          <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0f1e]', status.dot)} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{member.name}</span>
            {member.role === 'admin' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-white/30 truncate">{member.email}</p>

          <div className="flex items-center gap-3 mt-2">
            <div className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', status.class)}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/30">
              <Smartphone className="w-3 h-3" />
              {member.deviceCount} device{member.deviceCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Safety Score */}
        <div className="text-right flex-shrink-0">
          <div className={cn(
            'text-xl font-black tabular-nums',
            member.safetyScore >= 80 ? 'text-emerald-400' :
            member.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {member.safetyScore}
          </div>
          <div className="text-[10px] text-white/20">score</div>
          {/* Mini progress bar */}
          <div className="w-12 h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                member.safetyScore >= 80 ? 'bg-emerald-400' :
                member.safetyScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              )}
              style={{ width: `${member.safetyScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
