import type { Metadata } from 'next';
import FamilyMemberCard from '@/components/family/FamilyMemberCard';
import FamilyAlerts from '@/components/family/FamilyAlerts';
import { mockFamilyMembers, mockFamilyAlerts, mockFamilySafetyScore } from '@/features/family/mockData';
import { Users, UserPlus, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Family Circle — CyberDaddy',
  description: 'Protect your entire family with CyberDaddy. Monitor, alert, and shield every family member.',
};

export default function FamilyPage() {
  const protectedCount = mockFamilyMembers.filter((m) => m.protectionStatus === 'protected').length;
  const atRiskCount = mockFamilyMembers.filter((m) => m.protectionStatus === 'at-risk').length;

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Family Circle</h1>
          <p className="text-sm text-white/40">Monitor and protect every family member</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Family Score Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 border border-cyan-500/20 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 flex-shrink-0">
          <Shield className="w-8 h-8 text-black" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Family Safety Score</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{mockFamilySafetyScore}</span>
            <span className="text-white/30">/100</span>
            <span className="text-emerald-400 text-sm font-semibold">Good</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden max-w-xs">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{ width: `${mockFamilySafetyScore}%` }}
            />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-center">
          <div>
            <div className="text-2xl font-black text-emerald-400">{protectedCount}</div>
            <div className="text-[10px] text-white/30">Protected</div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-400">{atRiskCount}</div>
            <div className="text-[10px] text-white/30">At Risk</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{mockFamilyMembers.length}</div>
            <div className="text-[10px] text-white/30">Total</div>
          </div>
        </div>
      </div>

      {/* Members Grid + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-white/40" />
            <h2 className="text-sm font-semibold text-white">{mockFamilyMembers.length} Members</h2>
          </div>
          {mockFamilyMembers.map((member) => (
            <FamilyMemberCard key={member.id} member={member} />
          ))}
        </div>

        <div className="lg:col-span-2">
          <FamilyAlerts alerts={mockFamilyAlerts} />
        </div>
      </div>
    </div>
  );
}
