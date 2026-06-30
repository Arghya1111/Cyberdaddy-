'use client';

// ============================================================
// CyberDaddy — Forgot Password Page
// Step 1: user enters email → POST /users/auth/password-reset/
// Step 2: user enters new password + token from URL query param
//         → POST /users/auth/password-reset/confirm/
// ============================================================

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { authService } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';

// ── Step 1: Request reset email ───────────────────────────

function RequestResetForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Check your email</h2>
          <p className="text-sm text-white/40">
            We&apos;ve sent a password reset link to <span className="text-white/70">{email}</span>.
            The link expires in 1 hour.
          </p>
        </div>
        <p className="text-xs text-white/30">
          Didn&apos;t receive it?{' '}
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Try again
          </button>
        </p>
        <Link
          href="/login"
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2 mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">Reset Password</h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Send Reset Link
        </button>
      </form>

      <Link
        href="/login"
        className="mt-4 w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </Link>
    </>
  );
}

// ── Step 2: Confirm reset with token ─────────────────────

function ConfirmResetForm({ token }: { token: string }) {
  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (form.new_password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authService.confirmPasswordReset({
        token,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      setSuccess(true);
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Password Updated!</h2>
          <p className="text-sm text-white/40">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
        </div>
        <Link
          href="/login"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-white text-center mb-1">Set New Password</h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Choose a strong password for your CyberDaddy account.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {(['new_password', 'confirm_password'] as const).map((field) => (
          <div key={field}>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
              {field === 'new_password' ? 'New Password' : 'Confirm Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                name={field}
                value={form[field]}
                onChange={handleChange}
                placeholder={field === 'new_password' ? 'Min. 8 characters' : 'Repeat password'}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/20"
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={isLoading || !form.new_password || !form.confirm_password}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Reset Password
        </button>
      </form>
    </>
  );
}

// ── Page Shell ────────────────────────────────────────────

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    setResetToken(searchParams.get('token'));
  }, [searchParams]);

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-cyan-500/30">
            <Shield className="w-7 h-7 text-black" />
          </div>
        </div>

        {resetToken ? (
          <ConfirmResetForm token={resetToken} />
        ) : (
          <RequestResetForm />
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
