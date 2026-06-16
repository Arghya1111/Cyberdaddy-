'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Shield, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

const PAGE_TITLES: Record<string, string> = {
  '/chat': 'AI Assistant',
  '/': 'AI Assistant',
  '/dashboard': 'Dashboard',
  '/family': 'Family Circle',
  '/profile': 'Profile',
  '/history': 'Scan History',
  '/settings': 'Settings',
};

export default function TopBar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = PAGE_TITLES[pathname] ?? 'CyberDaddy';

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-sm sticky top-0 z-30 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-white text-sm">{title}</span>
        </div>

        <NotificationBell />
      </header>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-in slide-in-from-left duration-300">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
