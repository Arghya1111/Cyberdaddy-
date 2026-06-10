'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Message, Attachment, GroqMessage } from '@/types';
import { chatCompletion, analyzeScreenshot, generateRiskScore } from '@/services/groq';
import { routeCommand } from './commandRouter';
import { generateId, fileToBase64 } from '@/lib/utils';

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
            // Replace placeholder
            copy[copy.length - 1] = analysisMsg;
            return copy;
          });

          setIsLoading(false);
          return;
        }

        // ── 4. Regular chat (streaming) ──────────────────
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
