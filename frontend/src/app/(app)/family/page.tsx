'use client';

// ============================================================
// CyberDaddy — Family Circle Page
// Connects to /api/v1/family/dashboard/ and /family/members/
// Error handling:
//   400 "not in a family group" → premium onboarding
//   401 Unauthorized            → session expired state
//   403 Forbidden               → plan upgrade state
//   5xx Server Error            → "Something went wrong"
//   other                       → generic ErrorState
// ============================================================

import { useState, useCallback } from 'react';
import FamilyMemberCard from '@/components/family/FamilyMemberCard';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonFamilyMember } from '@/components/ui/SkeletonLoader';
import { useApi } from '@/hooks/useApi';
import { familyService, APIFamilyDashboard, APIFamilyMember } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyMember } from '@/types';
import {
  Users, Shield, X, Loader2, Copy, Check, AlertCircle,
  RefreshCw, ShieldCheck, Bell, Lock, ArrowRight,
  CheckCircle2, Star, CreditCard, ServerCrash, UserMinus, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Type Mapper ──────────────────────────────────────────

function mapApiMember(m: APIFamilyMember): FamilyMember {
  const score = m.user?.safety_score ?? 0;
  return {
    id: m.id,
    name: m.user?.full_name ?? 'Unknown',
    email: m.user?.email ?? '',
    role: m.role === 'parent' || m.role === 'guardian' ? 'admin' : 'member',
    protectionStatus: score >= 70 ? 'protected' : score >= 40 ? 'at-risk' : 'offline',
    safetyScore: Math.round(score),
    joinedAt: m.joined_at ? new Date(m.joined_at) : new Date(),
    deviceCount: 1,
  };
}

// ─── Create Family Modal ──────────────────────────────────

function CreateFamilyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await familyService.createFamily(name.trim());
      onCreated();
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-base font-bold text-white">Create Family Group</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
              Family Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. The Kumar Family"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/20"
            />
          </div>
          <p className="text-xs text-white/30">
            You&apos;ll become the admin and receive a shareable invite code for your family.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Create Family
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Code Display ──────────────────────────────────

function InviteCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
      <span className="text-sm font-mono font-bold text-white/80 tracking-widest">{code}</span>
      <button onClick={handleCopy} className="text-white/30 hover:text-cyan-400 transition-colors">
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Family Onboarding — Premium Empty State ──────────────

const ONBOARDING_BENEFITS = [
  { icon: Shield, label: 'Real-time protection', desc: 'Monitor all members instantly' },
  { icon: Bell,   label: 'Instant threat alerts', desc: 'Stay ahead of every danger' },
  { icon: Star,   label: 'Family safety score', desc: 'Shared health dashboard' },
  { icon: Users,  label: 'Up to 10 members',   desc: 'Full family coverage' },
] as const;

function FamilyOnboarding({
  onCreate,
  onJoined,
}: {
  onCreate: () => void;
  onJoined: () => void;
}) {
  const [code, setCode]         = useState('');
  const [isJoining, setJoining] = useState(false);
  const [joinError, setJoinErr] = useState<string | null>(null);
  const [joined, setJoined]     = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setJoinErr(null);
    try {
      await familyService.joinFamily(code.trim().toUpperCase());
      setJoined(true);
      setTimeout(() => onJoined(), 1200);
    } catch (err) {
      setJoinErr(normalizeError(err).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto flex items-start justify-center p-5 lg:p-8"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      <div className="w-full max-w-xl py-4">
        {/* ── Hero illustration ── */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-6">
            {/* Ambient glow */}
            <div className="absolute inset-0 rounded-3xl bg-cyan-500/10 blur-2xl scale-[2]" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0d2336] to-[#091a2a] border border-cyan-500/30 flex items-center justify-center shadow-xl shadow-cyan-500/10">
              <svg
                width="54"
                height="54"
                viewBox="0 0 54 54"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="fc-shield-grad" x1="0" y1="0" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22d3ee" />
                    <stop offset="1" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                {/* Shield outline */}
                <path
                  d="M27 5L8 13V29C8 39.5 16 47.5 27 51C38 47.5 46 39.5 46 29V13L27 5Z"
                  fill="url(#fc-shield-grad)"
                  fillOpacity="0.12"
                  stroke="url(#fc-shield-grad)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {/* People avatars */}
                <circle cx="20" cy="24" r="4.5" fill="#22d3ee" fillOpacity="0.85" />
                <circle cx="34" cy="24" r="4.5" fill="#34d399" fillOpacity="0.85" />
                <circle cx="27" cy="20" r="4.5" fill="#a78bfa" fillOpacity="0.85" />
                {/* Connection arcs */}
                <path d="M12 38C12 32.5 15.5 29 20 29C22.5 29 24.5 30 26 31.5"
                  stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
                <path d="M42 38C42 32.5 38.5 29 34 29C31.5 29 29.5 30 28 31.5"
                  stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
                <path d="M21 38C21 33 23.5 29.5 27 29.5C30.5 29.5 33 33 33 38"
                  stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
                <circle cx="27" cy="43" r="2" fill="url(#fc-shield-grad)" fillOpacity="0.5" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400/60 animate-pulse" />
            <span
              className="absolute -bottom-1 -left-2 w-2.5 h-2.5 rounded-full bg-emerald-400/40 animate-pulse"
              style={{ animationDelay: '700ms' }}
            />
          </div>

          <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Family Circle</h1>
          <p className="text-white/45 text-sm max-w-xs mx-auto leading-relaxed">
            You are not part of any family group yet. Create your own or join one with an invite code.
          </p>
        </div>

        {/* ── Benefits grid ── */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {ONBOARDING_BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">{label}</p>
                <p className="text-[10px] text-white/35 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Action card ── */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
          {/* Join via invite code */}
          <div className="p-5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Have an invite code?
            </p>

            {joinError && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            {joined && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Joined successfully! Loading your family dashboard…
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter code — e.g. ABCD1234"
                maxLength={12}
                disabled={joined}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/40 transition-all font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-white/20 disabled:opacity-40"
              />
              <button
                onClick={handleJoin}
                disabled={isJoining || !code.trim() || joined}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 transition-all whitespace-nowrap"
              >
                {isJoining
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ArrowRight className="w-4 h-4" />}
                Join Family
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-white/25 font-medium uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Create family */}
          <div className="p-5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Start your own family group
            </p>
            <button
              onClick={onCreate}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/8 to-emerald-500/8 text-cyan-400 font-semibold text-sm hover:from-cyan-500/15 hover:to-emerald-500/15 hover:border-cyan-500/40 transition-all"
            >
              <Shield className="w-4 h-4" />
              Create Family Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Remove Member Modal ──────────────────────────────────

function RemoveMemberModal({
  member,
  onClose,
  onRemoved,
}: {
  member: FamilyMember;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await familyService.removeMember(member.id);
      onRemoved();
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <UserMinus className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-base font-bold text-white">Remove Member</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">
          Are you sure you want to remove <span className="text-white font-semibold">{member.name}</span> from your family group? They will lose access to family features.
        </p>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-red-500/90 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Differentiated Error States ─────────────────────────

function UnauthorizedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-orange-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Session Expired</h3>
        <p className="text-sm text-white/40 mb-6">
          Your session has expired. Please sign in again to access Family Circle.
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm text-white transition-all mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

function ForbiddenState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-violet-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Family Plan Required</h3>
        <p className="text-sm text-white/40 mb-6">
          Family Circle requires a Family Plan. Upgrade your subscription to unlock this feature.
        </p>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30 text-violet-400 font-semibold text-sm hover:border-violet-500/50 transition-all">
            <CreditCard className="w-4 h-4" />
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function ServerErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <ServerCrash className="w-7 h-7 text-red-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Something went wrong</h3>
        <p className="text-sm text-white/40 mb-6">
          Our servers ran into an issue loading Family Circle. This is usually temporary — please try again.
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm text-white transition-all mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function FamilyPage() {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const isAdmin = user?.account_type === 'family_admin';

  const fetchDashboard = useCallback(() => familyService.getDashboard(), []);
  const fetchMembers   = useCallback(() => familyService.getMembers(), []);

  const {
    data: dashboard,
    isLoading: dashLoading,
    error: dashError,
    refetch: refetchDashboard,
  } = useApi<APIFamilyDashboard>(fetchDashboard);

  const {
    data: membersData,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useApi<APIFamilyMember[]>(fetchMembers);

  const isLoading = dashLoading || membersLoading;

  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchMembers();
    setInviteCode(null);
  }, [refetchDashboard, refetchMembers]);

  const handleRegenerateInvite = async () => {
    setIsRegenerating(true);
    setRegenerateError(null);
    try {
      const result = await familyService.regenerateInviteCode();
      setInviteCode(result.invite_code);
    } catch (err) {
      setRegenerateError(normalizeError(err).message);
    } finally {
      setIsRegenerating(false);
    }
  };

  // ── Classify errors ──────────────────────────────────
  const hasNoFamily =
    dashError?.status === 400 &&
    (dashError.message.toLowerCase().includes('not in a family group') ||
     dashError.message.toLowerCase().includes('no family'));

  const isUnauthorized = dashError?.status === 401;
  const isForbidden    = dashError?.status === 403;
  const isServerError  = !!dashError?.status && dashError.status >= 500;

  // ── Loading skeleton ─────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-36 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-52 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonFamilyMember key={i} />)}
        </div>
      </div>
    );
  }

  // ── 400: not in a family group → premium onboarding ──
  if (hasNoFamily) {
    return (
      <>
        <FamilyOnboarding
          onCreate={() => setShowCreateModal(true)}
          onJoined={handleRefresh}
        />
        {showCreateModal && (
          <CreateFamilyModal
            onClose={() => setShowCreateModal(false)}
            onCreated={handleRefresh}
          />
        )}
      </>
    );
  }

  // ── 401 Unauthorized ──────────────────────────────────
  if (isUnauthorized) return <UnauthorizedState onRetry={handleRefresh} />;

  // ── 403 Forbidden (plan required) ────────────────────
  if (isForbidden) return <ForbiddenState onRetry={handleRefresh} />;

  // ── 5xx Server error ──────────────────────────────────
  if (isServerError) return <ServerErrorState onRetry={handleRefresh} />;

  // ── Other / network errors ───────────────────────────
  if (dashError && !dashboard) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState error={dashError} onRetry={handleRefresh} />
      </div>
    );
  }

  // ── Happy path ───────────────────────────────────────
  const members: FamilyMember[] = (membersData ?? []).map(mapApiMember);
  const familyScore        = Math.round(dashboard?.average_safety_score ?? 0);
  const currentInviteCode  = inviteCode ?? dashboard?.group?.invite_code ?? '';
  const groupName          = dashboard?.group?.name ?? 'My Family';
  const totalScansThisMonth = dashboard?.total_scans_this_month ?? 0;
  const threatsThisMonth   = dashboard?.threats_this_month ?? 0;
  const scoreLabel         =
    familyScore >= 80 ? 'Excellent' : familyScore >= 60 ? 'Good' : 'Needs Attention';

  return (
    <div
      className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Family Circle</h1>
          <p className="text-sm text-white/40">{groupName} · Monitor and protect every member</p>
        </div>
        <div className="flex items-center gap-2">
          {currentInviteCode && (
            <div className="hidden sm:block">
              <InviteCodeBadge code={currentInviteCode} />
            </div>
          )}
          {isAdmin && (
            <button
              onClick={handleRegenerateInvite}
              disabled={isRegenerating}
              title="Regenerate invite code"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-yellow-400 transition-colors disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {regenerateError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {regenerateError}
        </div>
      )}

      {/* Family Score Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 border border-cyan-500/20 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 flex-shrink-0">
          <Shield className="w-8 h-8 text-black" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Family Safety Score</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{familyScore}</span>
            <span className="text-white/30">/100</span>
            <span
              className={cn(
                'text-sm font-semibold',
                familyScore >= 80 ? 'text-emerald-400' : familyScore >= 60 ? 'text-yellow-400' : 'text-red-400',
              )}
            >
              {scoreLabel}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden max-w-xs">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000"
              style={{ width: `${familyScore}%` }}
            />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-center">
          <div>
            <div className="text-2xl font-black text-cyan-400">{totalScansThisMonth}</div>
            <div className="text-[10px] text-white/30">Scans (month)</div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-400">{threatsThisMonth}</div>
            <div className="text-[10px] text-white/30">Threats</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{members.length}</div>
            <div className="text-[10px] text-white/30">Members</div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white">{members.length} Members</h2>
          </div>
          {currentInviteCode && (
            <div className="sm:hidden">
              <InviteCodeBadge code={currentInviteCode} />
            </div>
          )}
        </div>
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="relative group">
                <FamilyMemberCard member={member} />
                {isAdmin && member.role !== 'admin' && (
                  <button
                    onClick={() => setMemberToRemove(member)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-red-500/0 group-hover:bg-red-500/10 border border-transparent group-hover:border-red-500/20 flex items-center justify-center text-white/0 group-hover:text-red-400 transition-all"
                    title="Remove member"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <ShieldCheck className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40">No family members yet</p>
            <p className="text-xs text-white/20 mt-1">Share the invite code above to add family members</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateFamilyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleRefresh}
        />
      )}

      {memberToRemove && (
        <RemoveMemberModal
          member={memberToRemove}
          onClose={() => setMemberToRemove(null)}
          onRemoved={handleRefresh}
        />
      )}
    </div>
  );
}
