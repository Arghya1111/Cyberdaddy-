'use client';

// ============================================================
// CyberDaddy — Family Circle Page
// Connects to /api/v1/family/dashboard/ and /family/members/
// Handles: no family, join family, create family, invite code
// ============================================================

import { useState, useCallback } from 'react';
import FamilyMemberCard from '@/components/family/FamilyMemberCard';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonFamilyMember } from '@/components/ui/SkeletonLoader';
import { useApi } from '@/hooks/useApi';
import { familyService, APIFamilyDashboard, APIFamilyMember } from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { FamilyMember } from '@/types';
import {
  Users, UserPlus, Shield, X, Loader2, Copy, Check,
  AlertCircle, RefreshCw, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Type Mapper ──────────────────────────────────────────

function mapApiMember(m: APIFamilyMember): FamilyMember {
  const score = m.user?.safety_score ?? 0;
  return {
    id: m.id,
    name: m.user?.full_name ?? 'Unknown',
    email: m.user?.email ?? '',
    role: m.role === 'parent' ? 'admin' : 'member',
    protectionStatus: score >= 70 ? 'protected' : score >= 40 ? 'at-risk' : 'offline',
    safetyScore: Math.round(score),
    joinedAt: new Date(),
    deviceCount: 1,
  };
}

// ─── Join Family Modal ────────────────────────────────────

function JoinFamilyModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await familyService.joinFamily(code.trim().toUpperCase());
      onJoined();
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
          <h2 className="text-base font-bold text-white">Join a Family</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
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
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD1234"
              maxLength={12}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all font-mono tracking-widest uppercase"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">Cancel</button>
            <button
              onClick={handleJoin}
              disabled={isLoading || !code.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Join Family
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
          <h2 className="text-base font-bold text-white">Create a Family Group</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="w-5 h-5" /></button>
        </div>
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Family Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Kumar Family"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={isLoading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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

// ─── No Family State ──────────────────────────────────────

function NoFamilyState({ onJoin, onCreate }: { onJoin: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
        <Users className="w-10 h-10 text-cyan-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No Family Group Yet</h2>
      <p className="text-white/40 text-sm max-w-sm mb-8">
        Create a family group to protect everyone you care about, or join an existing one with an invite code.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Shield className="w-4 h-4" />
          Create Family Group
        </button>
        <button
          onClick={onJoin}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Join with Invite Code
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function FamilyPage() {
  const [modal, setModal] = useState<'join' | 'create' | null>(null);

  const fetchDashboard = useCallback(() => familyService.getDashboard(), []);
  const fetchMembers = useCallback(() => familyService.getMembers(), []);

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

  const handleRefresh = () => {
    refetchDashboard();
    refetchMembers();
  };

  // No family group (403 or empty data)
  const hasNoFamily = dashError?.status === 403 || dashError?.status === 404;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
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

  if (hasNoFamily) {
    return (
      <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <NoFamilyState onJoin={() => setModal('join')} onCreate={() => setModal('create')} />
        {modal === 'join' && <JoinFamilyModal onClose={() => setModal(null)} onJoined={handleRefresh} />}
        {modal === 'create' && <CreateFamilyModal onClose={() => setModal(null)} onCreated={handleRefresh} />}
      </div>
    );
  }

  if (dashError && !dashboard) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState error={dashError} onRetry={handleRefresh} message="Failed to load family data. Make sure the backend is running." />
      </div>
    );
  }

  const members: FamilyMember[] = (membersData ?? []).map(mapApiMember);
  const familyScore = Math.round(dashboard?.average_safety_score ?? 0);
  const inviteCode = dashboard?.group?.invite_code ?? '';
  const groupName = dashboard?.group?.name ?? 'My Family';
  const totalScansThisMonth = dashboard?.total_scans_this_month ?? 0;
  const threatsThisMonth = dashboard?.threats_this_month ?? 0;

  const scoreLabel = familyScore >= 80 ? 'Excellent' : familyScore >= 60 ? 'Good' : 'Needs Attention';

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
          {inviteCode && (
            <div className="hidden sm:block">
              <InviteCodeBadge code={inviteCode} />
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

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
            <span className={cn('text-sm font-semibold', familyScore >= 80 ? 'text-emerald-400' : familyScore >= 60 ? 'text-yellow-400' : 'text-red-400')}>
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
          {inviteCode && (
            <div className="sm:hidden">
              <InviteCodeBadge code={inviteCode} />
            </div>
          )}
        </div>
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <FamilyMemberCard key={member.id} member={member} />
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

      {modal === 'join' && <JoinFamilyModal onClose={() => setModal(null)} onJoined={handleRefresh} />}
      {modal === 'create' && <CreateFamilyModal onClose={() => setModal(null)} onCreated={handleRefresh} />}
    </div>
  );
}
