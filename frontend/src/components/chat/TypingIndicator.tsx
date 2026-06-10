'use client';

import { useEffect, useState } from 'react';

export default function TypingIndicator() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d >= 3 ? 1 : d + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
        <span className="text-xs font-bold text-black">CD</span>
      </div>
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block w-2 h-2 rounded-full transition-all duration-300 ${
              dots > i ? 'bg-cyan-400 scale-110' : 'bg-white/20'
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          />
        ))}
        <span className="ml-2 text-sm text-white/40 animate-pulse">CyberDaddy is thinking...</span>
      </div>
    </div>
  );
}
