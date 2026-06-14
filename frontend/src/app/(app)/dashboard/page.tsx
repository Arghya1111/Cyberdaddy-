'use client';

// ============================================================
// CyberDaddy — Dashboard Page
// Fetches real data from /insights/dashboard, /scans/stats,
// /scans/history, and /insights/trends APIs.
// ============================================================

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { insightService, scanService, APIInsightDashboard, APIScanStats, APIScanListItem } from '@/lib/apiServices';
import StatCard from '@/components/dashboard/StatCard';
import RiskTrendChart from '@/components/dashboard/RiskTrendChart';
import RecentScans from '@/components/dashboard/RecentScans';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonDashboard } from '@/components/ui/SkeletonLoader';
import {
  Shield, AlertTriangle, Users, CreditCard,
  Zap, Info, ShieldAlert, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Scan, RiskTrendPoint } from '@/types';

const INSIGHT_CONFIG = {
  danger: { icon: ShieldAlert, class: 'border-red-500/30 bg-red-500/5 text-red-400' },
  warning: { icon: AlertTriangle, class: 'border-orange-500/30 bg-orange-500/5 text-orange-400' },
  info: { icon: Info, class: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
};

// Map backend risk level → Scan type used by RecentScans component
function mapBackendScans(items: APIScanListItem[]): Scan[] {
  return items.map((s) => ({
    id: s.id,
    timestamp: new Date(s.created_at),
    fileName: (() => {
      if (s.scan_type === 'screenshot') return 'screenshot.jpg';
      if (s.ai_summary) return s.ai_summary.slice(0, 40) + '...';
      return s.scan_type;
    })(),
    riskScore: {
      score: Math.round(s.risk_score ?? 0),
      level: s.risk_level ?? 'safe',
      category: s.scam_category ?? 'Unknown',
      explanation: s.ai_summary ?? '',
      flags: [],
    },
    riskLevel: s.risk_level ?? 'safe',
    category: s.scam_category ?? 'Unknown',
    status: s.status as 'safe' | 'threat' | 'analyzing',
  }));
}

// Map backend trend → chart format
function mapTrend(insight: APIInsightDashboard): RiskTrendPoint[] {
  if (insight.monthly_safety_trend?.length) {
    return insight.monthly_safety_trend.slice(-8).map((p) => ({
      date: p.date,
      score: p.score ?? 0,
      threats: p.threats ?? 0,
    }));
  }
  return [];
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  const fetchInsights = useCallback(() => insightService.getDashboard(), []);
  const fetchStats = useCallback(() => scanService.getScanStats(), []);
  const fetchHistory = useCallback(() => scanService.getScanHistory({ page: 1 }), []);

  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = useApi<APIInsightDashboard>(fetchInsights);

  const {
    data: stats,
    isLoading: statsLoading,
  } = useApi<APIScanStats>(fetchStats);

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useApi<{ count: number; results: APIScanListItem[] }>(fetchHistory);

  const isLoading = authLoading || insightsLoading || statsLoading || historyLoading;

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (insightsError && !insights) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState
          error={insightsError}
          onRetry={refetchInsights}
          message="Failed to load dashboard data. Make sure the backend is running."
        />
      </div>
    );
  }

  const safetyScore = insights?.safety_score ?? stats?.average_risk_score ?? 0;
  const threatsDetected = insights?.total_threats_detected ?? stats?.threats_detected ?? 0;
  const totalScans = insights?.total_scans ?? stats?.total_scans ?? 0;
  const riskTrendData = insights ? mapTrend(insights) : [];
  const recentScans = historyData ? mapBackendScans(historyData.results.slice(0, 5)) : [];
  const recommendations = insights?.recommendations ?? [];

  const userName = user?.full_name?.split(' ')[0] ?? 'there';
  const planLabel = user?.account_type === 'family_admin' || user?.account_type === 'family_member'
    ? 'Family'
    : user?.account_type === 'enterprise'
    ? 'Enterprise'
    : 'Free';

  return (
    <div
      className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cybersecurity Dashboard</h1>
          <p className="text-sm text-white/40">
            Welcome back, {userName}! Here&apos;s your security overview.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">
            {threatsDetected === 0 ? 'All Systems Protected' : `${threatsDetected} Threats Detected`}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Safety Score"
          value={`${Math.round(safetyScore)}/100`}
          subtitle={insights?.risk_profile === 'very_safe' ? 'Excellent protection' : 'Stay vigilant'}
          trend={insights?.safety_score_trend !== undefined && insights.safety_score_trend !== 0 ? Math.round(insights.safety_score_trend) : undefined}
          icon={<Shield className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Threats Detected"
          value={threatsDetected}
          subtitle="All time"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Total Scans"
          value={totalScans}
          subtitle="Lifetime"
          icon={<Users className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Plan"
          value={planLabel}
          subtitle={`${stats?.remaining_scans ?? 0} scans left`}
          icon={<CreditCard className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Chart + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {riskTrendData.length > 0 ? (
            <RiskTrendChart data={riskTrendData} />
          ) : (
            <div className="h-72 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="text-center">
                <Shield className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">Run some scans to see your risk trend</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Insights / Recommendations */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">AI Insights</h3>
          </div>

          {insights?.ai_narrative ? (
            <div className="mb-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
              <p className="text-xs text-white/60 leading-relaxed line-clamp-4">{insights.ai_narrative}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, idx) => {
              const severity = idx === 0 ? 'warning' : 'info';
              const config = INSIGHT_CONFIG[severity];
              const Icon = config.icon;
              return (
                <div key={idx} className={cn('p-3 rounded-xl border', config.class)}>
                  <div className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-white/60 leading-relaxed">{rec}</p>
                  </div>
                </div>
              );
            })}

            {recommendations.length === 0 && (
              <div className={cn('p-3 rounded-xl border', INSIGHT_CONFIG.info.class)}>
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">You&apos;re well protected!</p>
                    <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">
                      No critical recommendations at this time. Keep scanning regularly.
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">Just now</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      {recentScans.length > 0 ? (
        <RecentScans scans={recentScans} />
      ) : (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
          <Shield className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-sm font-medium text-white/40">No scans yet</p>
          <p className="text-xs text-white/20 mt-1">
            Use the chat to scan suspicious messages or screenshots
          </p>
        </div>
      )}
    </div>
  );
}
