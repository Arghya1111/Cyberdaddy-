'use client';

// ============================================================
// CyberDaddy — Notification Bell
// Shows unread count badge and recent notifications dropdown.
// Polls backend every 30 seconds for new notifications.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, Shield, AlertTriangle, Info, CreditCard } from 'lucide-react';
import { notificationService, APINotification } from '@/lib/apiServices';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { isAuthenticated } from '@/lib/auth';

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  threat_alert: AlertTriangle,
  scan_complete: Shield,
  family_alert: Shield,
  subscription: CreditCard,
  payment: CreditCard,
  system: Info,
  welcome: Shield,
  weekly_report: Info,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  normal: 'text-cyan-400',
  low: 'text-white/40',
};

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<APINotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Poll unread count ─────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail — not critical
    }
  }, []);

  useEffect(() => {
    // fetchUnreadCount is async — setState is called only in async continuations,
    // never synchronously. The rule flags this as a false positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUnreadCount();
    pollRef.current = setInterval(() => { void fetchUnreadCount(); }, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Fetch notification list when opening ──────────────────
  const handleToggle = async () => {
    if (!isOpen) {
      setIsLoadingList(true);
      setIsOpen(true);
      try {
        const data = await notificationService.list({ page: 1 });
        setNotifications(data.results);
      } catch {
        setNotifications([]);
      } finally {
        setIsLoadingList(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  // ── Mark all read ─────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'read' as const }))
      );
    } catch {
      // Ignore
    }
  };

  // ── Mark single read ──────────────────────────────────────
  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, status: 'read' as const } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={handleToggle}
        className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors relative"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 bg-[#0e1628] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-white/50" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {isLoadingList ? (
              <div className="space-y-1 p-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-sm text-white/30">No notifications yet</p>
                <p className="text-xs text-white/20 mt-1">We&apos;ll notify you when there&apos;s activity</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notif) => {
                  const Icon = NOTIFICATION_ICONS[notif.notification_type] ?? Info;
                  const isUnread = notif.status !== 'read';
                  return (
                    <button
                      key={notif.id}
                      onClick={() => isUnread && handleMarkRead(notif.id)}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors',
                        isUnread ? 'bg-white/5 hover:bg-white/8' : 'hover:bg-white/3'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        isUnread ? 'bg-cyan-500/15' : 'bg-white/5'
                      )}>
                        <Icon className={cn('w-4 h-4', PRIORITY_COLORS[notif.priority] ?? 'text-white/40')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn('text-xs font-semibold truncate', isUnread ? 'text-white' : 'text-white/60')}>
                            {notif.title}
                          </p>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[10px] text-white/40 line-clamp-2 mt-0.5">{notif.body}</p>
                        <p className="text-[10px] text-white/20 mt-1">
                          {formatTimestamp(new Date(notif.created_at))}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
