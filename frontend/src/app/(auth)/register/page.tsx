'use client';

// ============================================================
// CyberDaddy — Register Page
// Connects to POST /api/v1/users/auth/register/
// ============================================================

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { normalizeError } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await register({
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim() || undefined,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      if (result.success) {
        setSuccess('Account created! Please check your email to verify your account before logging in.');
        setFormData({ full_name: '', email: '', phone_number: '', password: '', confirm_password: '' });
      }
    } catch (err) {
      const normalized = normalizeError(err);
      setError(normalized.message || 'Registration failed. Please try again.');
    } finally {
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

        {/* Success Message */}
        {success && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Account created successfully!</p>
              <p className="text-emerald-400/70">{success}</p>
              <Link href="/login" className="mt-2 inline-block font-semibold underline hover:no-underline">
                Sign in now →
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="phone_number" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Phone Number <span className="text-white/20 normal-case">(optional)</span>
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                autoComplete="tel"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                >
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
                id="confirm_password"
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Repeat password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
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
