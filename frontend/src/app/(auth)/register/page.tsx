'use client';

// ============================================================
// CyberDaddy — Register Page
// Flow:
//   1. Submit form → POST /api/v1/users/auth/register/
//   2. Auto-login  → POST /api/v1/users/auth/login/
//   3. Redirect to /dashboard with success + verify-email toasts
//   4. If auto-login fails (e.g. prod verification required)
//      → show verification UI (resend email, open Gmail)
// ============================================================

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { toast } from 'sonner';
import {
  Shield, Eye, EyeOff, Loader2, AlertCircle,
  CheckCircle2, Mail, ExternalLink, ArrowRight,
} from 'lucide-react';

// ── Verification fallback (shown only when auto-login fails) ──────────────

function VerificationFallback({ email }: { email: string }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResendLoading(true);
    setResendError(null);
    setResendMessage(null);
    try {
      const res = await authService.resendVerificationEmail(email);
      setResendMessage(res.message || 'Verification email resent!');
    } catch (err) {
      setResendError(normalizeError(err).message || 'Could not resend. Try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Account created successfully!</p>
          <p className="text-emerald-400/70">
            A verification link has been sent to{' '}
            <span className="text-emerald-400">{email}</span>.
            Click it to activate your account.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
        >
          <ExternalLink className="w-4 h-4" />
          Open Gmail
        </a>

        <button
          type="button"
          disabled={resendLoading}
          onClick={handleResend}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {resendLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            : <><Mail className="w-4 h-4" /> Resend Verification Email</>}
        </button>

        {resendMessage && <p className="text-emerald-400 text-xs text-center">{resendMessage}</p>}
        {resendError   && <p className="text-red-400    text-xs text-center">{resendError}</p>}
      </div>

      <p className="text-center text-xs text-white/30 pt-1">
        Already verified?{' '}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
          Sign in →
        </Link>
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [slowRequest, setSlowRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fallback state — only rendered when auto-login fails (prod verification mode)
  const [verifyFallback, setVerifyFallback] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setSlowRequest(false);
    setError(null);

    const slowTimer = setTimeout(() => setSlowRequest(true), 8_000);

    try {
      const emailTrimmed = formData.email.trim();
      const result = await register({
        email: emailTrimmed,
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim() || undefined,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      if (!result.success) {
        setError(result.message || 'Registration failed. Please try again.');
        return;
      }

      if (result.autoLoggedIn) {
        // ── Happy path: registered + logged in → go to dashboard ──────────
        toast.success('Welcome to CyberDaddy! 🛡️', {
          description: 'Your account has been created successfully.',
          duration: 5000,
        });
        toast('Verify your email to unlock full security features.', {
          icon: '📧',
          description: 'Check your inbox — a verification link has been sent.',
          duration: 8000,
          style: {
            background: '#1c1a10',
            border: '1px solid rgba(234,179,8,0.3)',
            color: '#fbbf24',
          },
        });
        router.replace('/dashboard');
      } else {
        // ── Fallback: auto-login failed (prod: verification required) ──────
        setRegisteredEmail(emailTrimmed);
        setVerifyFallback(true);
      }
    } catch (err) {
      setError(normalizeError(err).message || 'Registration failed. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setSlowRequest(false);
      setIsLoading(false);
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

        <h1 className="text-2xl font-bold text-white text-center mb-1">Create account</h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Start protecting yourself and your family
        </p>

        {/* Verification fallback (prod mode) */}
        {verifyFallback && <VerificationFallback email={registeredEmail} />}

        {!verifyFallback && (
          <>
            {/* Slow-request hint */}
            {slowRequest && !error && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
                <Loader2 className="w-4 h-4 flex-shrink-0 mt-0.5 animate-spin" />
                <span>The server is waking up — this can take up to 30 s on first use. Please wait&hellip;</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="full_name" name="full_name" type="text" required autoComplete="name"
                  value={formData.full_name} onChange={handleChange} placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="email" name="email" type="email" required autoComplete="email"
                  value={formData.email} onChange={handleChange} placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Phone (optional) */}
              <div>
                <label htmlFor="phone_number" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                  Phone Number <span className="text-white/20 normal-case">(optional)</span>
                </label>
                <input
                  id="phone_number" name="phone_number" type="tel" autoComplete="tel"
                  value={formData.phone_number} onChange={handleChange} placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password" name="password" required minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm_password" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  id="confirm_password" name="confirm_password" required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirm_password} onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Submit */}
              <button
                id="register-submit" type="submit" disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 mt-2"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                  : <><ArrowRight className="w-4 h-4" /> Create Account</>}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-white/30 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-white/20 mt-6">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
