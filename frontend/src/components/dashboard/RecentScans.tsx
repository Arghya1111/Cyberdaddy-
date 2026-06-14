'use client';

import { Scan, RiskScore } from '@/types';
import { formatTimestamp, getRiskBgClass } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { FileImage, CheckCircle, Clock, XCircle, ShieldAlert } from 'lucide-react';

interface RecentScansProps {
  scans: Scan[];
}

// Handle riskScore as either number or RiskScore object
function getRiskValue(riskScore: number | RiskScore): number {
  if (typeof riskScore === 'number') return riskScore;
  return riskScore.score;
}

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
  safe: CheckCircle,
  threat: ShieldAlert,
  analyzing: Clock,
};

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-emerald-400',
  pending: 'text-yellow-400',
  failed: 'text-red-400',
  safe: 'text-emerald-400',
  threat: 'text-red-400',
  analyzing: 'text-yellow-400',
};

export default function RecentScans({ scans }: RecentScansProps) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Recent Scans</h3>
        <span className="text-xs text-white/30">{scans.length} scans</span>
      </div>
      <div className="space-y-2">
        {scans.map((scan) => {
          const score = getRiskValue(scan.riskScore);
          const StatusIcon = STATUS_ICON[scan.status] ?? CheckCircle;
          const statusColor = STATUS_COLOR[scan.status] ?? 'text-white/40';
          return (
            <div
              key={scan.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors border border-white/5 hover:border-white/10 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <FileImage className="w-4 h-4 text-white/30" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/70 truncate">{scan.fileName}</span>
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                    getRiskBgClass(scan.riskLevel)
                  )}>
                    {scan.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusIcon className={cn('w-3 h-3', statusColor)} />
                  <span className="text-[10px] text-white/30">{formatTimestamp(scan.timestamp)}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className={cn(
                  'text-sm font-bold tabular-nums',
                  score >= 70 ? 'text-red-400' :
                  score >= 40 ? 'text-yellow-400' : 'text-emerald-400'
                )}>
                  {score}
                </div>
                <div className="text-[10px] text-white/20">risk</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
