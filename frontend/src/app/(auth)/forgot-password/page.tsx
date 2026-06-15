'use client';

import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Shield className="w-7 h-7 text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-1">Reset Password</h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Password reset is not yet available in this version. Please contact support.
        </p>

        <Link
          href="/login"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
