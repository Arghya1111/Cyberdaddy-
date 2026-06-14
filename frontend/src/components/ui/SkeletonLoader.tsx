'use client';

// ============================================================
// CyberDaddy — Skeleton Loader Components
// Reusable animated skeleton placeholders for loading states.
// ============================================================

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-white/5',
        className
      )}
    />
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────

export function SkeletonStatCard() {
  return (
    <div className="p-4 lg:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="w-8 h-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24')}
        />
      ))}
    </div>
  );
}

// ─── Dashboard Skeleton ───────────────────────────────────

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-5 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
      </div>

      {/* Chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-28" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Scans table */}
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Profile Skeleton ─────────────────────────────────────

export function SkeletonProfile() {
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-start gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Family Skeleton ──────────────────────────────────────

export function SkeletonFamilyMember() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

// ─── Notification Skeleton ────────────────────────────────

export function SkeletonNotification() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  );
}
