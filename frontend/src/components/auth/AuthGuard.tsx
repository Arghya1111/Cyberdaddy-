'use client';

// ============================================================
// CyberDaddy — Auth Guard
// Wraps protected pages. Redirects to /login if not
// authenticated. Shows a spinner while auth is loading.
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // While checking auth state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Shield className="w-7 h-7 text-black" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 opacity-30 blur-xl animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Securing your session...
        </div>
      </div>
    );
  }

  // Not authenticated — render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
