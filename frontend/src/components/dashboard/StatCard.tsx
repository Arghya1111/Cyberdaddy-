'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // percentage change
  icon: ReactNode;
  color?: 'cyan' | 'emerald' | 'orange' | 'red' | 'purple';
  className?: string;
}

const COLOR_MAP = {
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 shadow-cyan-500/10',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 shadow-emerald-500/10',
  orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 shadow-orange-500/10',
  red: 'from-red-500/20 to-red-500/5 border-red-500/20 shadow-red-500/10',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 shadow-purple-500/10',
};

const ICON_COLOR_MAP = {
  cyan: 'text-cyan-400 bg-cyan-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  orange: 'text-orange-400 bg-orange-500/10',
  red: 'text-red-400 bg-red-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'cyan',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl border bg-gradient-to-br backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        COLOR_MAP[color],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">{title}</p>
          <p className="text-3xl font-black text-white tabular-nums leading-none">{value}</p>
          {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', ICON_COLOR_MAP[color])}>
          {icon}
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          {trend > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : trend < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-white/30" />
          )}
          <span className={cn(
            'text-xs font-semibold',
            trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/30'
          )}>
            {trend > 0 ? '+' : ''}{trend}% this week
          </span>
        </div>
      )}
    </div>
  );
}
