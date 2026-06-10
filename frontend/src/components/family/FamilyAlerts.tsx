'use client';

import { FamilyAlert } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, ShieldAlert, CheckCircle } from 'lucide-react';

interface FamilyAlertsProps {
  alerts: FamilyAlert[];
}

const SEVERITY_CONFIG = {
  danger: { icon: ShieldAlert, class: 'border-red-500/30 bg-red-500/5 text-red-400', dot: 'bg-red-400' },
  warning: { icon: AlertTriangle, class: 'border-orange-500/30 bg-orange-500/5 text-orange-400', dot: 'bg-orange-400' },
  info: { icon: Info, class: 'border-blue-500/30 bg-blue-500/5 text-blue-400', dot: 'bg-blue-400' },
};

export default function FamilyAlerts({ alerts }: FamilyAlertsProps) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Shared Alerts</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
          {alerts.filter((a) => !a.resolved).length} active
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity];
          const Icon = config.icon;
          return (
            <div key={alert.id} className={cn('flex items-start gap-3 p-3 rounded-xl border', config.class)}>
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white">{alert.memberName}</span>
                  {alert.resolved && (
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{alert.message}</p>
                <p className="text-[10px] text-white/30 mt-1">{formatTimestamp(alert.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
