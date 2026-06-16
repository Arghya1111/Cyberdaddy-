'use client';

// ============================================================
// CyberDaddy — Scan History Page
// Connects to GET /api/v1/scans/history/ (paginated + filtered)
// ============================================================

import { useState, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { scanService, APIScanListItem, PaginatedResponse } from '@/lib/apiServices';
import RecentScans from '@/components/dashboard/RecentScans';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { Scan } from '@/types';
import {
  History, Search, Filter, ChevronLeft, ChevronRight, RefreshCw,
  Shield, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Map backend scan list item → Scan type ───────────────

function mapBackendScans(items: APIScanListItem[]): Scan[] {
  return items.map((s) => ({
    id: s.id,
    timestamp: new Date(s.created_at),
    fileName: (() => {
      if (s.scan_type === 'screenshot') return 'screenshot.jpg';
      return s.ai_summary?.slice(0, 40) ?? s.scan_type;
    })(),
    riskScore: {
      score: Math.round(s.risk_score ?? 0),
      level: s.risk_level ?? 'safe',
      category: s.scam_category ?? 'Unknown',
      explanation: s.ai_summary ?? '',
      flags: [],
    },
    riskLevel: s.risk_level ?? 'safe',
    category: s.scam_category ?? s.scan_type ?? 'Unknown',
    status: s.is_threat ? 'threat' as const : 'safe' as const,
  }));
}

const RISK_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Safe', value: 'safe' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

const TYPE_FILTERS = [
  { label: 'All Types', value: '' },
  { label: 'Screenshot', value: 'screenshot' },
  { label: 'SMS', value: 'sms' },
  { label: 'URL', value: 'url' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone_number' },
];

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  const fetchHistory = useCallback(
    () => scanService.getScanHistory({
      page,
      risk_level: riskFilter || undefined,
      scan_type: typeFilter || undefined,
      ordering: '-created_at',
    }),
    [page, riskFilter, typeFilter]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useApi<PaginatedResponse<APIScanListItem>>(fetchHistory, { deps: [page, riskFilter, typeFilter] });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputValue);
  };

  const handleFilterChange = (type: 'risk' | 'scantype', value: string) => {
    setPage(1);
    if (type === 'risk') setRiskFilter(value);
    else setTypeFilter(value);
  };

  const scans = data ? mapBackendScans(data.results) : [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 20);
  const threats = scans.filter((s) => s.riskLevel !== 'safe').length;
  const safe = scans.filter((s) => s.riskLevel === 'safe').length;

  return (
    <div
      className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Scan History</h1>
          <p className="text-sm text-white/40">
            {isLoading ? 'Loading...' : `${totalCount} scans recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/30">
            <Search className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search scans..."
              className="bg-transparent text-sm outline-none placeholder:text-white/30 w-36 text-white"
            />
          </form>
          <button
            onClick={refetch}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Scans', value: totalCount, color: 'text-white' },
          { label: 'Threats Found', value: threats, color: 'text-red-400' },
          { label: 'Safe', value: safe, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <div className={cn('text-2xl font-black', color)}>
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/20" /> : value}
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          <Filter className="w-3 h-3 text-white/30" />
          <span className="text-xs text-white/30">Risk:</span>
          <div className="flex gap-1">
            {RISK_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange('risk', f.value)}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-lg transition-colors',
                  riskFilter === f.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          <span className="text-xs text-white/30">Type:</span>
          <div className="flex gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange('scantype', f.value)}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-lg transition-colors',
                  typeFilter === f.value
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </div>
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={refetch}
          message="Failed to load scan history. Make sure the backend is running."
        />
      ) : scans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="w-12 h-12 text-white/10 mb-4" />
          <h3 className="text-white font-semibold mb-1">No scans found</h3>
          <p className="text-sm text-white/30">
            {riskFilter || typeFilter
              ? 'Try changing the filters to see more results.'
              : 'Start by scanning a suspicious message or screenshot in the chat.'}
          </p>
        </div>
      ) : (
        <RecentScans scans={scans} />
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/20 text-sm">
            <History className="w-4 h-4" />
            <span>Page {page} of {totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-white/40 px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
