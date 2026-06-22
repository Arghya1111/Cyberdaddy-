'use client';

// ============================================================
// CyberDaddy — Email Verification Page
// Handles links sent via verification email:
//   {FRONTEND_URL}/verify-email?token=<token>
// Calls GET /api/v1/users/verify-email/<token>/
// ============================================================

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { authService } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';

type VerifyStatus = 'loading' | 'success' | 'error' | 'no-token';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>(token ? 'loading' : 'no-token');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    authService.verifyEmail(token)
      .then((res) => {
        setVerifyStatus('success');
        setMessage(res.message || 'Your email has been verified successfully.');
      })
      .catch((err) => {
        setVerifyStatus('error');
        const normalized = normalizeError(err);
        setMessage(
          normalized.message ||
          'This verification link is invalid or has already been used. Please request a new one.'
        );
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendError(null);
    setResendMessage(null);
    try {
      const res = await authService.resendVerificationEmail(resendEmail.trim());
      setResendMessage(res.message || 'Verification email sent. Please check your inbox.');
    } catch (err) {
      const normalized = normalizeError(err);
      setResendError(normalized.message || 'Could not send email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Shield className="w-7 h-7 text-black" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-1">Email Verification</h1>

        {/* Loading */}
        {verifyStatus === 'loading' && (
          <div className="mt-8 flex flex-col items-center gap-4 text-white/60">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            <p className="text-sm">Verifying your email address…</p>
          </div>
        )}

        {/* Success */}
        {verifyStatus === 'success' && (
          <div className="mt-6">
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-emerald-400 font-semibold">{message}</p>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
            >
              Sign In Now →
            </Link>
          </div>
        )}

        {/* Error */}
        {verifyStatus === 'error' && (
          <div className="mt-6">
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-red-400 font-semibold text-sm">{message}</p>
            </div>

            {/* Resend form */}
            <p className="text-white/40 text-sm text-center mb-4">
              Need a new verification link? Enter your email below.
            </p>
            <form onSubmit={handleResend} className="space-y-3">
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
              />
              {resendMessage && (
                <p className="text-emerald-400 text-xs text-center">{resendMessage}</p>
              )}
              {resendError && (
                <p className="text-red-400 text-xs text-center">{resendError}</p>
              )}
              <button
                type="submit"
                disabled={resendLoading}
                className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {resendLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Mail className="w-4 h-4" /> Resend Verification Email</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* No token in URL */}
        {verifyStatus === 'no-token' && (
          <div className="mt-6">
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center mb-6">
              <Mail className="w-10 h-10 text-amber-400" />
              <p className="text-amber-400 font-semibold text-sm">
                No verification token found. Please use the link from your email.
              </p>
            </div>

            <p className="text-white/40 text-sm text-center mb-4">
              Didn't receive the email? Resend it:
            </p>
            <form onSubmit={handleResend} className="space-y-3">
              <input
                type="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
              />
              {resendMessage && (
                <p className="text-emerald-400 text-xs text-center">{resendMessage}</p>
              )}
              {resendError && (
                <p className="text-red-400 text-xs text-center">{resendError}</p>
              )}
              <button
                type="submit"
                disabled={resendLoading}
                className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {resendLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Mail className="w-4 h-4" /> Resend Verification Email</>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-sm text-white/30 mt-6">
          Back to{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md flex flex-col items-center gap-4 pt-16 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-sm">Loading…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
