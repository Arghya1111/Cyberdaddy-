'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Attachment } from '@/types';
import { SendHorizonal, ImageIcon, Square, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  onOpenUpload: () => void;
  isLoading: boolean;
  onStop: () => void;
}

const SUGGESTIONS = [
  'What is phishing?',
  '/scan',
  '/dashboard',
  'How to stay safe online?',
];

export default function ChatInput({ onSend, onOpenUpload, isLoading, onStop }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() && !isLoading) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  };

  const handleSuggestion = (s: string) => {
    if (s.startsWith('/')) {
      onSend(s);
    } else {
      setValue(s);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 space-y-3">
      {/* Quick Suggestions */}
      <div className="flex gap-2 flex-wrap">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:border-white/30 transition-all duration-200 hover:bg-white/10"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className={cn(
        'flex items-end gap-3 p-3 rounded-2xl border transition-all duration-200 backdrop-blur-sm',
        'bg-white/5 border-white/10',
        'focus-within:border-cyan-500/50 focus-within:bg-white/8 focus-within:shadow-lg focus-within:shadow-cyan-500/5'
      )}>
        {/* Upload button */}
        <button
          onClick={onOpenUpload}
          title="Upload screenshot for analysis"
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-cyan-500/20 flex items-center justify-center transition-all duration-200 hover:text-cyan-400 text-white/40 group"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask CyberDaddy anything, or type / for commands..."
          rows={1}
          className="flex-1 bg-transparent text-white placeholder:text-white/25 text-sm resize-none outline-none leading-relaxed min-h-[36px] max-h-[160px] py-2"
        />

        {/* Screenshot icon hint */}
        <button
          onClick={onOpenUpload}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-500/20 flex items-center justify-center transition-all duration-200 hover:text-emerald-400 text-white/40"
          title="Scan screenshot"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Send / Stop */}
        {isLoading ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-all duration-200 text-red-400"
            title="Stop generation"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center transition-all duration-200 text-black disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 active:scale-95"
            title="Send message"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-center text-xs text-white/15">
        CyberDaddy AI · Powered by Groq · Not a substitute for professional security advice
      </p>
    </div>
  );
}
