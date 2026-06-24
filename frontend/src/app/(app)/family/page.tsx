'use client';

// ============================================================
// CyberDaddy — Family Circle Page
// Connects to /api/v1/family/ endpoints.
// Error handling:
//   400 "not in a family group" → onboarding state
//   401 Unauthorized            → session expired
//   403 Forbidden               → plan upgrade state
//   5xx Server Error            → "Something went wrong"
// ============================================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FamilyMemberCard from '@/components/family/FamilyMemberCard';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonFamilyMember } from '@/components/ui/SkeletonLoader';
import { useApi } from '@/hooks/useApi';
import {
  familyService,
  APIFamilyDashboard, APIFamilyMember,
} from '@/lib/apiServices';
import { normalizeError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyMember } from '@/types';
import {
  Users, Shield, X, Loader2, Copy, Check, AlertCircle,
  RefreshCw, ShieldCheck, Bell, Lock, ArrowRight,
  CheckCircle2, CreditCard, ServerCrash, UserMinus, RotateCcw,
  Mail, UserCog, Pencil, Trash2, LogOut, Crown, Share2,
  ChevronDown, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Type Mapper ──────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  parent: 'Parent',
  guardian: 'Guardian',
  child: 'Child',
  elderly: 'Elderly',
  member: 'Member',
};

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

// ─── Shared Modal Wrapper ─────────────────────────────────

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0e1628] border border-white/10 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  icon: Icon,
  iconClass,
  title,
  onClose,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      {message}
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
    <ModalShell onClose={onClose}>
      <ModalHeader
        icon={Shield}
        iconClass="bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/20 text-cyan-400"
        title="Create Family Group"
        onClose={onClose}
      />
      {error && <InlineError message={error} />}
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
    </ModalShell>
  );
}

// ─── Rename Family Modal ──────────────────────────────────

function RenameFamilyModal({
  currentName,
  onClose,
  onRenamed,
}: {
  currentName: string;
  onClose: () => void;
  onRenamed: (newName: string) => void;
}) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRename = async () => {
    if (!name.trim() || name.trim() === currentName) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await familyService.renameFamily(name.trim());
      onRenamed(updated.name);
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader icon={Pencil} iconClass="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" title="Rename Family" onClose={onClose} />
      {error && <InlineError message={error} />}
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-all"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={handleRename}
            disabled={isLoading || !name.trim() || name.trim() === currentName}
            className="flex-1 py-2.5 rounded-xl bg-cyan-500/90 text-black font-bold text-sm hover:bg-cyan-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Email Invite Modal ───────────────────────────────────

function EmailInviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await familyService.sendInviteEmail(email.trim().toLowerCase());
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader icon={Mail} iconClass="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" title="Invite via Email" onClose={onClose} />
      {error && <InlineError message={error} />}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Invitation sent! They&apos;ll receive an email with the join link.
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="family@example.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/20"
          />
        </div>
        <p className="text-xs text-white/30">
          They&apos;ll receive an invite link with your family&apos;s join code.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Done</button>
          <button
            onClick={handleSend}
            disabled={isLoading || !email.trim()}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500/90 text-black font-bold text-sm hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Invite
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Change Role Modal ────────────────────────────────────

const MEMBER_ROLES = [
  { value: 'parent',   label: 'Parent',   desc: 'Full family dashboard access' },
  { value: 'guardian', label: 'Guardian', desc: 'Like parent, without admin rights' },
  { value: 'member',   label: 'Member',   desc: 'Standard adult member' },
  { value: 'child',    label: 'Child',    desc: 'Restricted access, parents notified' },
  { value: 'elderly',  label: 'Elderly',  desc: 'Full data access, simplified UI' },
];

function ChangeRoleModal({
  member,
  currentApiRole,
  onClose,
  onChanged,
}: {
  member: FamilyMember;
  currentApiRole: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [role, setRole] = useState(currentApiRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleSave = async () => {
    if (role === currentApiRole) { onClose(); return; }
    setIsLoading(true);
    setError(null);
    try {
      await familyService.updateMemberRole(member.id, role);
      onChanged();
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  const selected = MEMBER_ROLES.find((r) => r.value === role);

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader icon={UserCog} iconClass="bg-purple-500/10 border border-purple-500/20 text-purple-400" title={`Change Role — ${member.name}`} onClose={onClose} />
      {error && <InlineError message={error} />}
      <div className="space-y-4">
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:border-white/20 transition-all"
          >
            <span>{selected?.label ?? 'Select role'}</span>
            <ChevronDown className={cn('w-4 h-4 text-white/40 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#0e1628] border border-white/10 shadow-xl z-10 overflow-hidden">
              {MEMBER_ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors',
                    role === r.value && 'bg-purple-500/10',
                  )}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{r.label}</div>
                    <div className="text-xs text-white/40">{r.desc}</div>
                  </div>
                  {role === r.value && <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-purple-500/90 text-white font-bold text-sm hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Role
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Transfer Ownership Modal ─────────────────────────────

function TransferOwnershipModal({
  members,
  onClose,
  onTransferred,
}: {
  members: APIFamilyMember[];
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleMembers = members.filter((m) => m.is_active);

  const handleTransfer = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    setError(null);
    try {
      await familyService.transferOwnership(selectedId);
      onTransferred();
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader icon={Crown} iconClass="bg-amber-500/10 border border-amber-500/20 text-amber-400" title="Transfer Ownership" onClose={onClose} />
      <p className="text-sm text-white/50 mb-4">Select a member to become the new family admin. You will lose admin privileges.</p>
      {error && <InlineError message={error} />}
      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {eligibleMembers.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
              selectedId === m.id
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/8',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
              {m.user?.full_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white">{m.user?.full_name}</div>
              <div className="text-xs text-white/40">{ROLE_LABEL[m.role] ?? m.role}</div>
            </div>
            {selectedId === m.id && <Check className="w-4 h-4 text-amber-400" />}
          </button>
        ))}
      </div>
      {selectedId && (
        <label className="flex items-center gap-2 text-xs text-white/50 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-white/20"
          />
          I understand I will lose admin privileges
        </label>
      )}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Cancel</button>
        <button
          onClick={handleTransfer}
          disabled={isLoading || !selectedId || !confirmed}
          className="flex-1 py-2.5 rounded-xl bg-amber-500/90 text-black font-bold text-sm hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          Transfer
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Delete Family Modal ──────────────────────────────────

function DeleteFamilyModal({
  groupName,
  onClose,
  onDeleted,
}: {
  groupName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await familyService.deleteFamilyGroup();
      onDeleted();
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader icon={Trash2} iconClass="bg-red-500/10 border border-red-500/20 text-red-400" title="Delete Family Circle" onClose={onClose} />
      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-4 leading-relaxed">
        This will permanently delete <strong className="text-red-400">{groupName}</strong> and remove all members. This action cannot be undone.
      </div>
      {error && <InlineError message={error} />}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Type the family name to confirm
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={groupName}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-red-500/50 transition-all placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={isLoading || confirmation !== groupName}
            className="flex-1 py-2.5 rounded-xl bg-red-500/90 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Forever
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Leave Family Modal ───────────────────────────────────

function LeaveFamilyModal({
  groupName,
  onClose,
  onLeft,
}: {
  groupName: string;
  onClose: () => void;
  onLeft: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await familyService.leaveFamily();
      onLeft();
      onClose();
    } catch (err) {
      setError(normalizeError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader icon={LogOut} iconClass="bg-orange-500/10 border border-orange-500/20 text-orange-400" title="Leave Family Circle" onClose={onClose} />
      <p className="text-sm text-white/50 mb-4">
        Are you sure you want to leave <span className="text-white font-semibold">{groupName}</span>? You will need a new invite code to rejoin.
      </p>
      {error && <InlineError message={error} />}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Cancel</button>
        <button
          onClick={handleLeave}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl bg-orange-500/90 text-white font-bold text-sm hover:bg-orange-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Leave
        </button>
      </div>
    </ModalShell>
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
    <ModalShell onClose={onClose}>
      <ModalHeader icon={UserMinus} iconClass="bg-red-500/10 border border-red-500/20 text-red-400" title="Remove Member" onClose={onClose} />
      <p className="text-sm text-white/50 mb-4">
        Remove <span className="text-white font-semibold">{member.name}</span> from your family? They will lose access to family features.
      </p>
      {error && <InlineError message={error} />}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">Cancel</button>
        <button
          onClick={handleRemove}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl bg-red-500/90 text-white font-bold text-sm hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
          Remove
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Invite Code Badge ────────────────────────────────────

function InviteCodeBadge({ code, inviteUrl }: { code: string; inviteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
        <span className="text-sm font-mono font-bold text-white/80 tracking-widest">{code}</span>
        <button onClick={handleCopyCode} className="text-white/30 hover:text-cyan-400 transition-colors" title="Copy code">
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <button
        onClick={handleCopyLink}
        title="Copy invite link"
        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-cyan-400 transition-colors"
      >
        {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Family Onboarding ─────────────────────────────────────

const ONBOARDING_BENEFITS = [
  { icon: Shield, label: 'Real-time protection', desc: 'Monitor all members instantly' },
  { icon: Bell,   label: 'Instant threat alerts', desc: 'Stay ahead of every danger' },
  { icon: Star,   label: 'Family safety score',   desc: 'Shared health dashboard' },
  { icon: Users,  label: 'Up to 10 members',      desc: 'Full family coverage' },
] as const;

function FamilyOnboarding({ onCreate, onJoined }: { onCreate: () => void; onJoined: () => void }) {
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
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-3xl bg-cyan-500/10 blur-2xl scale-[2]" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0d2336] to-[#091a2a] border border-cyan-500/30 flex items-center justify-center shadow-xl shadow-cyan-500/10">
              <svg width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="fc-shield-grad" x1="0" y1="0" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22d3ee" /><stop offset="1" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <path d="M27 5L8 13V29C8 39.5 16 47.5 27 51C38 47.5 46 39.5 46 29V13L27 5Z" fill="url(#fc-shield-grad)" fillOpacity="0.12" stroke="url(#fc-shield-grad)" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="20" cy="24" r="4.5" fill="#22d3ee" fillOpacity="0.85" />
                <circle cx="34" cy="24" r="4.5" fill="#34d399" fillOpacity="0.85" />
                <circle cx="27" cy="20" r="4.5" fill="#a78bfa" fillOpacity="0.85" />
                <path d="M12 38C12 32.5 15.5 29 20 29C22.5 29 24.5 30 26 31.5" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
                <path d="M42 38C42 32.5 38.5 29 34 29C31.5 29 29.5 30 28 31.5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
                <path d="M21 38C21 33 23.5 29.5 27 29.5C30.5 29.5 33 33 33 38" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
                <circle cx="27" cy="43" r="2" fill="url(#fc-shield-grad)" fillOpacity="0.5" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400/60 animate-pulse" />
            <span className="absolute -bottom-1 -left-2 w-2.5 h-2.5 rounded-full bg-emerald-400/40 animate-pulse" style={{ animationDelay: '700ms' }} />
          </div>
          <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Family Circle</h1>
          <p className="text-white/45 text-sm max-w-xs mx-auto leading-relaxed">
            You are not part of any family group yet. Create your own or join one with an invite code.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {ONBOARDING_BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:bg-white/[0.04] transition-colors">
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

        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
          <div className="p-5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Have an invite code?</p>
            {joinError && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{joinError}</span>
              </div>
            )}
            {joined && (
              <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />Joined! Loading your family dashboard…
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
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Join
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-white/25 font-medium uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Start your own family group</p>
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

// ─── Error States ─────────────────────────────────────────

function UnauthorizedState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-orange-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Session Expired</h3>
        <p className="text-sm text-white/40 mb-6">Your session has expired. Please sign in again.</p>
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm text-white transition-all mx-auto">
          <RefreshCw className="w-4 h-4" />Refresh
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
        <h3 className="text-white font-semibold mb-2">Access Denied</h3>
        <p className="text-sm text-white/40 mb-6">You don&apos;t have permission to access Family Circle.</p>
        <div className="flex items-center gap-3 justify-center">
          <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm text-white transition-all">
            <RefreshCw className="w-4 h-4" />Retry
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
        <p className="text-sm text-white/40 mb-6">Our servers ran into an issue. This is usually temporary.</p>
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm text-white transition-all mx-auto">
          <RefreshCw className="w-4 h-4" />Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

type ActiveModal =
  | 'create' | 'rename' | 'email-invite' | 'delete' | 'transfer'
  | 'leave' | { type: 'remove'; member: FamilyMember }
  | { type: 'change-role'; member: FamilyMember; apiRole: string }
  | null;

export default function FamilyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [localGroupName, setLocalGroupName] = useState<string | null>(null);

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
    setLocalGroupName(null);
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

  // ── Error classification ──────────────────────────────
  const hasNoFamily =
    dashError?.status === 400 &&
    (dashError.message.toLowerCase().includes('not in a family group') ||
     dashError.message.toLowerCase().includes('no family'));

  const isUnauthorized = dashError?.status === 401;
  const isForbidden    = dashError?.status === 403;
  const isServerError  = !!dashError?.status && dashError.status >= 500;

  // ── Loading skeleton ──────────────────────────────────
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

  // ── Differentiated error states ───────────────────────
  if (hasNoFamily) {
    return (
      <>
        <FamilyOnboarding onCreate={() => setActiveModal('create')} onJoined={handleRefresh} />
        {activeModal === 'create' && (
          <CreateFamilyModal onClose={() => setActiveModal(null)} onCreated={handleRefresh} />
        )}
      </>
    );
  }
  if (isUnauthorized) return <UnauthorizedState onRetry={handleRefresh} />;
  if (isForbidden)    return <ForbiddenState    onRetry={handleRefresh} />;
  if (isServerError)  return <ServerErrorState  onRetry={handleRefresh} />;
  if (dashError && !dashboard) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState error={dashError} onRetry={handleRefresh} />
      </div>
    );
  }

  // ── Happy path data ───────────────────────────────────
  const members: FamilyMember[] = (membersData ?? []).map(mapApiMember);
  const familyScore             = Math.round(dashboard?.average_safety_score ?? 0);
  const currentInviteCode       = inviteCode ?? dashboard?.group?.invite_code ?? '';
  const groupName               = localGroupName ?? dashboard?.group?.name ?? 'My Family';
  const totalScansThisMonth     = dashboard?.total_scans_this_month ?? 0;
  const threatsThisMonth        = dashboard?.threats_this_month ?? 0;
  const scoreLabel              = familyScore >= 80 ? 'Excellent' : familyScore >= 60 ? 'Good' : 'Needs Attention';

  const adminUserId = dashboard?.group?.admin?.id;
  const isAdmin     = !!(user?.id && adminUserId && user.id === adminUserId);

  const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cyberdaddy.in';
  const inviteUrl   = `${frontendUrl}/family?code=${currentInviteCode}`;

  return (
    <div
      className="h-full overflow-y-auto p-5 lg:p-6 space-y-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{groupName}</h1>
            {isAdmin && (
              <button
                onClick={() => setActiveModal('rename')}
                title="Rename family"
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-cyan-400 transition-all"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-sm text-white/40">Family Circle · Monitor and protect every member</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentInviteCode && (
            <div className="hidden sm:block">
              <InviteCodeBadge code={currentInviteCode} inviteUrl={inviteUrl} />
            </div>
          )}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveModal('email-invite')}
                title="Invite via email"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-emerald-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={handleRegenerateInvite}
                disabled={isRegenerating}
                title="Regenerate invite code"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-yellow-400 transition-colors disabled:opacity-50"
              >
                {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              </button>
            </>
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
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{regenerateError}
        </div>
      )}

      {/* Mobile invite code */}
      {currentInviteCode && (
        <div className="sm:hidden">
          <InviteCodeBadge code={currentInviteCode} inviteUrl={inviteUrl} />
        </div>
      )}

      {/* ── Safety Score Banner ── */}
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
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000" style={{ width: `${familyScore}%` }} />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-center">
          <div><div className="text-2xl font-black text-cyan-400">{totalScansThisMonth}</div><div className="text-[10px] text-white/30">Scans (month)</div></div>
          <div><div className="text-2xl font-black text-red-400">{threatsThisMonth}</div><div className="text-[10px] text-white/30">Threats</div></div>
          <div><div className="text-2xl font-black text-white">{members.length}</div><div className="text-[10px] text-white/30">Members</div></div>
        </div>
      </div>

      {/* ── Member List ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white">{members.length} Members</h2>
          </div>
          {currentInviteCode && (
            <div className="sm:hidden">
              <InviteCodeBadge code={currentInviteCode} inviteUrl={inviteUrl} />
            </div>
          )}
        </div>

        {members.length > 0 ? (
          <div className="space-y-3">
            {(membersData ?? []).map((apiMember) => {
              const member = mapApiMember(apiMember);
              const isThisAdmin = apiMember.user?.id === adminUserId;
              return (
                <div key={member.id} className="relative group">
                  <FamilyMemberCard member={member} />
                  {/* Role badge overlay */}
                  <div className="absolute top-3 left-[calc(3rem+1rem)] flex items-center gap-1.5">
                    {isThisAdmin && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5" />Head
                      </span>
                    )}
                    {!isThisAdmin && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                        {ROLE_LABEL[apiMember.role] ?? apiMember.role}
                      </span>
                    )}
                  </div>
                  {/* Admin actions per member */}
                  {isAdmin && !isThisAdmin && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setActiveModal({ type: 'change-role', member, apiRole: apiMember.role })}
                        className="w-7 h-7 rounded-lg bg-purple-500/0 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 flex items-center justify-center text-white/0 group-hover:text-purple-400 transition-all"
                        title="Change role"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setActiveModal({ type: 'remove', member })}
                        className="w-7 h-7 rounded-lg bg-red-500/0 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 flex items-center justify-center text-white/0 group-hover:text-red-400 transition-all"
                        title="Remove member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <ShieldCheck className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40">No family members yet</p>
            <p className="text-xs text-white/20 mt-1">Share the invite code above to add family members</p>
          </div>
        )}
      </div>

      {/* ── Admin Controls Panel ── */}
      {isAdmin && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-5 space-y-3">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Admin Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setActiveModal('email-invite')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 hover:border-emerald-500/25 transition-all"
            >
              <Mail className="w-4 h-4" />Invite via Email
            </button>
            <button
              onClick={() => setActiveModal('transfer')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-400 text-sm font-medium hover:bg-amber-500/10 hover:border-amber-500/25 transition-all"
            >
              <Crown className="w-4 h-4" />Transfer Ownership
            </button>
            <button
              onClick={() => setActiveModal('delete')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/10 hover:border-red-500/25 transition-all"
            >
              <Trash2 className="w-4 h-4" />Delete Family
            </button>
          </div>
        </div>
      )}

      {/* ── Non-admin Leave button ── */}
      {!isAdmin && dashboard?.group && (
        <div className="flex justify-end">
          <button
            onClick={() => setActiveModal('leave')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/5 border border-orange-500/15 text-orange-400 text-sm font-medium hover:bg-orange-500/10 hover:border-orange-500/25 transition-all"
          >
            <LogOut className="w-4 h-4" />Leave Family
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {activeModal === 'rename' && (
        <RenameFamilyModal
          currentName={groupName}
          onClose={() => setActiveModal(null)}
          onRenamed={(n) => { setLocalGroupName(n); setActiveModal(null); }}
        />
      )}

      {activeModal === 'email-invite' && (
        <EmailInviteModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'transfer' && (
        <TransferOwnershipModal
          members={membersData ?? []}
          onClose={() => setActiveModal(null)}
          onTransferred={handleRefresh}
        />
      )}

      {activeModal === 'delete' && (
        <DeleteFamilyModal
          groupName={groupName}
          onClose={() => setActiveModal(null)}
          onDeleted={() => { setActiveModal(null); router.refresh(); handleRefresh(); }}
        />
      )}

      {activeModal === 'leave' && dashboard?.group && (
        <LeaveFamilyModal
          groupName={groupName}
          onClose={() => setActiveModal(null)}
          onLeft={() => { setActiveModal(null); handleRefresh(); }}
        />
      )}

      {activeModal !== null && typeof activeModal === 'object' && activeModal.type === 'remove' && (
        <RemoveMemberModal
          member={activeModal.member}
          onClose={() => setActiveModal(null)}
          onRemoved={handleRefresh}
        />
      )}

      {activeModal !== null && typeof activeModal === 'object' && activeModal.type === 'change-role' && (
        <ChangeRoleModal
          member={activeModal.member}
          currentApiRole={activeModal.apiRole}
          onClose={() => setActiveModal(null)}
          onChanged={handleRefresh}
        />
      )}
    </div>
  );
}
