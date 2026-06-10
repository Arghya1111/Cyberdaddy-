'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RiskTrendPoint } from '@/types';

interface RiskTrendChartProps {
  data: RiskTrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1526] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-white/40 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60 capitalize">{p.name}:</span>
          <span className="text-white font-bold">{p.value}{p.name === 'score' ? '/100' : ''}</span>
        </div>
      ))}
    </div>
  );
};

export default function RiskTrendChart({ data }: RiskTrendChartProps) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Safety Score Trend</h3>
          <p className="text-xs text-white/40">Last 8 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Safety Score
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Threats
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={{ fill: '#10b981', r: 3 }}
            activeDot={{ r: 5, fill: '#10b981' }}
          />
          <Area
            type="monotone"
            dataKey="threats"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#threatGradient)"
            dot={{ fill: '#ef4444', r: 3 }}
            activeDot={{ r: 5, fill: '#ef4444' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
