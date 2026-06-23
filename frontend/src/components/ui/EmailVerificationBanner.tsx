'use client';

// ============================================================
// CyberDaddy — Email Verification Banner
// Shown persistently at the top of every app page when the
// authenticated user has not yet verified their email.
// The banner is dismissible for the current session only.
// ============================================================

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { ShieldAlert, Mail, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  // Only render when the user is loaded and email is not verified
  if (!user || user.is_email_verified || dismissed) return null;

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.resendVerificationEmail(user.email);
      toast.success('Verification email sent!', {
        description: `Check your inbox at ${user.email}`,
        duration: 5000,
      });
    } catch (err) {
      toast.error('Could not send verification email.', {
        description: normalizeError(err).message,
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
      <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
        {/* Icon + text */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300 leading-snug">
            <span className="font-semibold">Email not verified.</span>{' '}
            <span className="text-amber-300/70">
              Verify now to secure your account and recover access if you forget your password.
            </span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {resending
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
              : <><Mail className="w-3 h-3" /> Resend Email</>}
          </button>

          <a
            href="/verify-email"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" />
            Verify Email
          </a>

          {/* Dismiss for this session */}
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
