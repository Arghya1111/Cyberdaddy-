import type { Metadata } from 'next';
import RecentScans from '@/components/dashboard/RecentScans';
import { mockRecentScans } from '@/features/dashboard/mockData';
import { History, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Scan History — CyberDaddy',
  description: 'Browse all your previous screenshot scans and threat analysis results.',
};

export default function HistoryPage() {
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Scan History</h1>
          <p className="text-sm text-white/40">{mockRecentScans.length} scans recorded</p>
        </div>

        {/* Search bar (UI only for MVP) */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/30">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Search scans..."
            className="bg-transparent text-sm outline-none placeholder:text-white/30 w-36"
            readOnly
          />
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Scans', value: mockRecentScans.length, color: 'text-white' },
          { label: 'Threats Found', value: mockRecentScans.filter((s) => s.riskLevel !== 'safe').length, color: 'text-red-400' },
          { label: 'Safe', value: mockRecentScans.filter((s) => s.riskLevel === 'safe').length, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <RecentScans scans={mockRecentScans} />

      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2 text-white/20 text-sm">
          <History className="w-4 h-4" />
          <span>Showing all {mockRecentScans.length} scans · History retained for 90 days on Pro plan</span>
        </div>
      </div>
    </div>
  );
}
