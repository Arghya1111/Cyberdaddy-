// ============================================================
// CyberDaddy — Utility Helpers
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ─── Tailwind class merger ───────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── ID generation ───────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Date / time formatting ──────────────────────────────

/**
 * Returns a human-readable relative timestamp, e.g. "2 minutes ago".
 */
export function formatTimestamp(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1_000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return formatDate(date);
}

/**
 * Returns a short date string, e.g. "15 Jun 2026".
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── File helpers ─────────────────────────────────────────

/**
 * Format a byte count into a human-readable string.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Convert a File object to a base64 data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Risk level helpers ───────────────────────────────────

type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Returns a Tailwind background/border class pair for a given risk level.
 */
export function getRiskBgClass(level: RiskLevel | string): string {
  const map: Record<string, string> = {
    safe: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    low: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    medium: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    critical: 'bg-red-500/10 border-red-500/20 text-red-400',
  };
  return map[level] ?? map.medium;
}
