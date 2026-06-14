// ============================================================
// CyberDaddy — Auth Route Layout
// Centered layout for login/register pages (no sidebar/topbar).
//
// NOTE: This layout does NOT render its own <html>/<body> tags.
// Next.js App Router nests route layouts — the root layout.tsx
// already provides <html> and <body>. Rendering them again here
// caused duplicate roots and hydration mismatches.
// ============================================================

import type { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CyberDaddy — Sign In',
  description: 'Sign in to CyberDaddy to protect yourself and your family from online threats.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      {/* Logo header */}
      <header className="relative z-10 flex items-center gap-3 px-8 py-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Shield className="w-5 h-5 text-black" />
        </div>
        <span className="font-bold text-white tracking-tight text-lg">CyberDaddy</span>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer — year is static to avoid server/client mismatch */}
      <footer className="relative z-10 text-center py-4 text-white/20 text-xs">
        © 2025 CyberDaddy. Protecting families from digital threats.
      </footer>
    </div>
  );
}
