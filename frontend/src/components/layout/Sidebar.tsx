'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, LayoutDashboard, Users, User, History,
  Settings, Shield, X, Zap, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/family', label: 'Family Circle', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/history', label: 'Scan History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-[#080d1a] border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">CyberDaddy</span>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-semibold">Family Plan</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Safety Score Badge */}
      <div className="mx-4 mt-4 p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50">Safety Score</span>
          <span className="text-xs font-bold text-emerald-400">Excellent</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-white tabular-nums">84</span>
          <span className="text-white/30 text-sm">/100</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000"
            style={{ width: '84%' }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === '/chat' && pathname === '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 text-cyan-400 border border-cyan-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-cyan-400' : 'text-white/30 group-hover:text-white/60')} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      <div className="p-4 border-t border-white/5">
        <button
          className="w-full flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200 group text-left"
          onClick={() => {
            if (onClose) onClose();
            window.dispatchEvent(new CustomEvent('cyberdaddy:command', { detail: '/pay' }));
          }}
        >
          <CreditCard className="w-4 h-4 text-cyan-400" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">Upgrade Plan</div>
            <div className="text-[10px] text-white/30">Unlock unlimited scans</div>
          </div>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 mt-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            RK
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/70 truncate">Rajesh Kumar</div>
            <div className="text-[10px] text-white/30 truncate">rajesh@gmail.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
