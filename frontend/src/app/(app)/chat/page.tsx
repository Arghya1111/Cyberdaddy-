import type { Metadata } from 'next';
import ChatWindow from '@/components/chat/ChatWindow';

export const metadata: Metadata = {
  title: 'Chat — CyberDaddy AI Assistant',
  description: 'Chat with CyberDaddy AI. Analyze screenshots, ask about threats, and get real-time cybersecurity advice.',
};

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ChatWindow />
    </div>
  );
}
