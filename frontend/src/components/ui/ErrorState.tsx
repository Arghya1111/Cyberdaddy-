'use client';

// ============================================================
// CyberDaddy — Error State Component
// Reusable error display with retry functionality.
// ============================================================

import { AlertTriangle, RefreshCw, WifiOff, Lock } from 'lucide-react';
import { APIError } from '@/lib/api';

interface ErrorStateProps {
  error: APIError | null;
  onRetry?: () => void;
  compact?: boolean;
  message?: string;
}

function getErrorConfig(error: APIError | null) {
  if (!error) return null;

  if (error.status === 401 || error.status === 403) {
    return {
      icon: Lock,
      title: 'Access Restricted',
      color: 'text-orange-400',
      bg: 'bg-orange-500/5 border-orange-500/20',
    };
  }

  if (!error.status || error.message.includes('connect')) {
    return {
      icon: WifiOff,
      title: 'Connection Error',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/5 border-yellow-500/20',
    };
  }

  return {
    icon: AlertTriangle,
    title: 'Something went wrong',
    color: 'text-red-400',
    bg: 'bg-red-500/5 border-red-500/20',
  };
}

export default function ErrorState({ error, onRetry, compact, message }: ErrorStateProps) {
  const displayMessage = message ?? error?.message ?? 'An unexpected error occurred.';
  const config = getErrorConfig(error) ?? {
    icon: AlertTriangle,
    title: 'Error',
    color: 'text-red-400',
    bg: 'bg-red-500/5 border-red-500/20',
  };

  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${config.bg}`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
        <span className="text-sm text-white/60 flex-1">{displayMessage}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${config.bg}`}>
        <Icon className={`w-7 h-7 ${config.color}`} />
      </div>
      <h3 className="text-white font-semibold mb-2">{config.title}</h3>
      <p className="text-sm text-white/40 max-w-sm mb-6">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 text-sm text-white transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
