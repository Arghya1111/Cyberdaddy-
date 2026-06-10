'use client';

import { Message } from '@/types';
import { formatTimestamp, getRiskBgClass } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { pricingPlans } from '@/features/payments/plansData';
import { HELP_COMMANDS } from '@/features/chat/commandRouter';
import { Check, Zap, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

interface MessageBubbleProps {
  message: Message;
}

// ─── Inline Help Component ────────────────────────────────

function HelpPanel() {
  return (
    <div className="mt-3 grid gap-2">
      {HELP_COMMANDS.map((cmd) => (
        <div
          key={cmd.command}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors group"
        >
          <code className="text-cyan-400 font-mono text-sm font-semibold bg-cyan-500/10 px-2 py-0.5 rounded flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors">
            {cmd.command}
          </code>
          <span className="text-white/60 text-sm">{cmd.description}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Pricing Component ─────────────────────────────

function PricingPanel() {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {pricingPlans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            'relative p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02]',
            plan.highlighted
              ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'bg-white/5 border-white/10 hover:border-white/20'
          )}
        >
          {plan.badge && (
            <span className="absolute -top-2.5 left-4 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-black">
              {plan.badge}
            </span>
          )}
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-white">
              {plan.price === 0 ? 'Free' : `₹${plan.price}`}
            </span>
            {plan.price > 0 && <span className="text-white/40 text-sm">/mo</span>}
          </div>
          <div className="text-base font-semibold text-white mb-1">{plan.name}</div>
          <div className="text-xs text-white/40 mb-3">{plan.description}</div>
          <ul className="space-y-1.5">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-white/70">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                {f}
              </li>
            ))}
            {plan.features.length > 4 && (
              <li className="text-xs text-white/40 pl-5">+{plan.features.length - 4} more</li>
            )}
          </ul>
          <button className={cn(
            'mt-4 w-full py-2 rounded-xl text-sm font-semibold transition-all duration-200',
            plan.highlighted
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:opacity-90'
              : 'bg-white/10 text-white hover:bg-white/20'
          )}>
            {plan.price === 0 ? 'Get Started Free' : `Choose ${plan.name}`}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Risk Score Card ──────────────────────────────────────

function RiskScoreCard({ riskScore }: { riskScore: NonNullable<Message['metadata']>['riskScore'] }) {
  if (!riskScore) return null;

  const bgClass = getRiskBgClass(riskScore.level);
  const icons: Record<string, typeof ShieldAlert> = {
    critical: ShieldAlert,
    high: ShieldAlert,
    medium: AlertTriangle,
    low: Info,
    safe: Check,
  };
  const Icon = icons[riskScore.level] ?? Info;

  return (
    <div className={cn('mt-3 p-4 rounded-2xl border', bgClass)}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div>
          <div className="font-bold text-sm">Risk Score: {riskScore.score}/100</div>
          <div className="text-xs opacity-70 capitalize">{riskScore.level} risk · {riskScore.category}</div>
        </div>
        <div className="ml-auto text-2xl font-black tabular-nums">{riskScore.score}</div>
      </div>
      {riskScore.flags.length > 0 && (
        <div className="space-y-1">
          {riskScore.flags.map((flag, i) => (
            <div key={i} className="flex items-center gap-2 text-xs opacity-80">
              <Zap className="w-3 h-3 flex-shrink-0" />
              {flag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Message Bubble ──────────────────────────────────

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2 group">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          {/* Attachments */}
          {message.attachments?.map((att) => (
            <div key={att.id} className="relative rounded-2xl overflow-hidden border border-white/10 max-w-[280px]">
              <Image
                src={att.url}
                alt={att.name}
                width={280}
                height={200}
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
          {/* Text */}
          {message.content && (
            <div className="bg-gradient-to-br from-cyan-600/80 to-cyan-700/80 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed backdrop-blur-sm border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              {message.content}
            </div>
          )}
          <span className="text-xs text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3 px-4 py-2 group">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20 mt-1">
        <span className="text-xs font-bold text-black">CD</span>
      </div>

      <div className="flex-1 max-w-[85%] space-y-1">
        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm">
          {message.content ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-cyan-400 prose-code:text-emerald-400 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded prose-a:text-cyan-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="w-20 h-4 bg-white/10 rounded animate-pulse" />
          )}

          {/* Inline components */}
          {message.metadata?.component === 'help' && <HelpPanel />}
          {message.metadata?.component === 'pricing' && <PricingPanel />}
        </div>

        {/* Risk Score Card */}
        {message.metadata?.riskScore && (
          <RiskScoreCard riskScore={message.metadata.riskScore} />
        )}

        <span className="text-xs text-white/20 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
          CyberDaddy · {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
