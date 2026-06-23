'use client';

// ============================================================
// CyberDaddy — App Route Group Layout
// Applied to: /chat, /dashboard, /family, /profile,
//             /history, /settings
// Guards: redirects unauthenticated users to /login
// ============================================================

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import AuthGuard from '@/components/auth/AuthGuard';
import EmailVerificationBanner from '@/components/ui/EmailVerificationBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Mobile Top Bar — only shows on small screens */}
      <TopBar />

      {/* Email verification reminder — visible on all app pages when unverified */}
      <EmailVerificationBanner />

      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 xl:w-72 flex-shrink-0">
          <Sidebar />
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
