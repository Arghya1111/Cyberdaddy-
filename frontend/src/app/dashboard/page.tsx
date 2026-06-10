import type { Metadata } from 'next';
import StatCard from '@/components/dashboard/StatCard';
import RiskTrendChart from '@/components/dashboard/RiskTrendChart';
import RecentScans from '@/components/dashboard/RecentScans';
import { mockDashboardStats, mockAiInsights } from '@/features/dashboard/mockData';
import {
  Shield, AlertTriangle, Users, CreditCard,
  Zap, Info, ShieldAlert, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dashboard — CyberDaddy',
  description: 'Your cybersecurity dashboard with safety scores, threat detection, and AI insights.',
};

const INSIGHT_CONFIG = {
  danger: { icon: ShieldAlert, class: 'border-red-500/30 bg-red-500/5 text-red-400' },
  warning: { icon: AlertTriangle, class: 'border-orange-500/30 bg-orange-500/5 text-orange-400' },
  info: { icon: Info, class: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
};

export default function DashboardPage() {
  const stats = mockDashboardStats;

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cybersecurity Dashboard</h1>
          <p className="text-sm text-white/40">Welcome back, Rajesh! Here's your security overview.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">All Systems Protected</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Safety Score"
          value={`${stats.safetyScore}/100`}
          subtitle="Excellent protection"
          trend={8}
          icon={<Shield className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Threats Detected"
          value={stats.threatsDetected}
          subtitle="This month"
          trend={-12}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Family Protected"
          value={stats.familyMembersProtected}
          subtitle="Members active"
          icon={<Users className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Subscription"
          value={stats.activeSubscription}
          subtitle="Active plan"
          icon={<CreditCard className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskTrendChart data={stats.riskTrend} />
        </div>

        {/* AI Insights */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">AI Insights</h3>
          </div>
          <div className="space-y-2">
            {mockAiInsights.map((insight) => {
              const config = INSIGHT_CONFIG[insight.severity];
              const Icon = config.icon;
              return (
                <div key={insight.id} className={cn('p-3 rounded-xl border', config.class)}>
                  <div className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-white">{insight.title}</p>
                      <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{insight.description}</p>
                      <p className="text-[10px] text-white/20 mt-1">{formatTimestamp(insight.timestamp)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <RecentScans scans={stats.recentScans} />
    </div>
  );
}
