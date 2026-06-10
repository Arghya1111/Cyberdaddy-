'use client';

import { useState } from 'react';
import { useChat } from '@/features/chat/useChat';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import ScreenshotUpload from './ScreenshotUpload';
import { Attachment } from '@/types';
import { Shield } from 'lucide-react';

export default function ChatWindow() {
  const { messages, isLoading, sendMessage, clearChat, stopGeneration } = useChat();
  const [showUpload, setShowUpload] = useState(false);
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, isLoading]);

  const handleUpload = (attachments: Attachment[]) => {
    sendMessage('', attachments);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0f1e]" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">CyberDaddy AI</p>
            <p className="text-xs text-emerald-400">Online · Protected by Groq</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-1 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <TypingIndicator />
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/5">
        <ChatInput
          onSend={(text, atts) => sendMessage(text, atts)}
          onOpenUpload={() => setShowUpload(true)}
          isLoading={isLoading}
          onStop={stopGeneration}
        />
      </div>

      {/* Screenshot upload modal */}
      {showUpload && (
        <ScreenshotUpload
          onUpload={handleUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
