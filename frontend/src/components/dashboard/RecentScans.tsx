'use client';

import { Scan } from '@/types';
import { formatTimestamp, getRiskBgClass } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { FileImage, CheckCircle, Clock, XCircle } from 'lucide-react';

interface RecentScansProps {
  scans: Scan[];
}

const STATUS_ICON: Record<Scan['status'], typeof CheckCircle> = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
};
const STATUS_COLOR: Record<Scan['status'], string> = {
  completed: 'text-emerald-400',
  pending: 'text-yellow-400',
  failed: 'text-red-400',
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
          const StatusIcon = STATUS_ICON[scan.status];
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
                  <StatusIcon className={cn('w-3 h-3', STATUS_COLOR[scan.status])} />
                  <span className="text-[10px] text-white/30">{formatTimestamp(scan.timestamp)}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className={cn(
                  'text-sm font-bold tabular-nums',
                  scan.riskScore >= 70 ? 'text-red-400' :
                  scan.riskScore >= 40 ? 'text-yellow-400' : 'text-emerald-400'
                )}>
                  {scan.riskScore}
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
