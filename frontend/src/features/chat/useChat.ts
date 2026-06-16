'use client';

// ============================================================
// CyberDaddy — Chat Hook
// Handles AI chat via Groq (client-side streaming) and
// submits scans to the Django backend for persistence.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Message, Attachment, GroqMessage } from '@/types';
import { chatCompletion, analyzeScreenshot, generateRiskScore } from '@/services/groq';
import { routeCommand } from './commandRouter';
import { generateId } from '@/lib/utils';
import { scanService } from '@/lib/apiServices';
import { getAccessToken } from '@/lib/auth';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 **Welcome to CyberDaddy!** I'm your AI-powered cybersecurity assistant.

I can help you:
- 🔍 **Analyze screenshots** for scams, phishing & threats
- 🛡️ **Explain** cybersecurity threats in plain language
- 📊 Monitor your family's **digital safety**
- 💬 Answer any **cybersecurity questions**

**Quick start:** Type \`/help\` to see all commands, or just ask me anything!`,
  timestamp: new Date(),
};

export function useChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(false);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === 'assistant') {
        copy[copy.length - 1] = { ...last, content };
      }
      return copy;
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      if (!text.trim() && !attachments?.length) return;
      if (isLoading) return;

      // ── 1. Add user message ──────────────────────────────
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
        attachments,
      };
      addMessage(userMsg);
      setIsLoading(true);
      abortRef.current = false;

      try {
        // ── 2. Handle slash commands ─────────────────────
        if (text.startsWith('/')) {
          const result = routeCommand(text, router);
          if (result.handled) {
            const sysMsg: Message = {
              id: generateId(),
              role: 'assistant',
              content: result.systemMessage ?? '',
              timestamp: new Date(),
              metadata: {
                component:
                  result.inlineComponent === 'pricing'
                    ? 'pricing'
                    : result.inlineComponent === 'help'
                    ? 'help'
                    : undefined,
              },
            };
            addMessage(sysMsg);
            setIsLoading(false);
            return;
          }
        }

        // ── 3. Screenshot analysis ───────────────────────
        if (attachments?.length) {
          const img = attachments[0];

          // Placeholder message
          const placeholderMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: '🔍 **Analyzing your screenshot...** Please wait while I scan for threats.',
            timestamp: new Date(),
          };
          addMessage(placeholderMsg);

          // Run Groq analysis
          const analysis = await analyzeScreenshot(img.url);
          const riskScore = await generateRiskScore(analysis);

          const analysisMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: analysis,
            timestamp: new Date(),
            metadata: { riskScore },
          };

          setMessages((prev) => {
            const copy = [...prev];
            // Replace placeholder with real result
            copy[copy.length - 1] = analysisMsg;
            return copy;
          });

          // ── Save scan to backend (fire-and-forget) ───────
          // Only if user is authenticated
          if (getAccessToken()) {
            try {
              // Convert data URL to File for upload
              const response = await fetch(img.url);
              const blob = await response.blob();
              const file = new File([blob], img.name ?? 'screenshot.jpg', { type: blob.type || 'image/jpeg' });
              const result = await scanService.submitScreenshotScan(file);
              // Silently update message with backend scan ID for reference
              if (result?.scan_id) {
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last?.id === analysisMsg.id) {
                    copy[copy.length - 1] = {
                      ...last,
                      metadata: { ...last.metadata, scanId: result.scan_id },
                    };
                  }
                  return copy;
                });
              }
            } catch {
              // Don't show error to user — backend save is non-critical
              // The Groq analysis already showed a result
            }
          }

          setIsLoading(false);
          return;
        }

        // ── 4. Text scan (SMS/URL) detection via backend ─
        // If user pastes a URL or SMS-like message, also submit to backend
        const isUrl = /^https?:\/\//i.test(text.trim());
        const isSmsLike = text.length < 500 && text.length > 10 && !text.includes('\n');
        
        if ((isUrl || isSmsLike) && getAccessToken() && !text.startsWith('/')) {
          // Submit text scan in background (non-blocking)
          const scanType = isUrl ? 'url' : 'sms';
          scanService.submitTextScan({ scan_type: scanType, content: text.trim() }).catch(() => {});
        }

        // ── 5. Regular chat (streaming) ──────────────────
        const history: GroqMessage[] = messages
          .filter((m) => m.id !== 'welcome')
          .slice(-10)
          .map((m) => ({
            role: m.role as GroqMessage['role'],
            content: m.content,
          }));

        history.push({ role: 'user', content: text });

        // Create placeholder assistant message
        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        addMessage(assistantMsg);

        let accumulated = '';
        await chatCompletion(history, (chunk) => {
          if (abortRef.current) return;
          accumulated += chunk;
          setStreamingContent(accumulated);
          updateLastAssistantMessage(accumulated);
        });

        setStreamingContent('');
      } catch (err) {
        const errMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `⚠️ **Error**: ${err instanceof Error ? err.message : 'Something went wrong. Please try again.'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            copy[copy.length - 1] = errMsg;
          } else {
            copy.push(errMsg);
          }
          return copy;
        });
      } finally {
        setIsLoading(false);
        setStreamingContent('');
      }
    },
    [isLoading, messages, addMessage, updateLastAssistantMessage, router]
  );

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    clearChat,
    stopGeneration,
  };
}
