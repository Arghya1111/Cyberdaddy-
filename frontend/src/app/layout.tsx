import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CyberDaddy — AI Cybersecurity Assistant',
  description:
    'CyberDaddy protects you and your family from online scams, phishing, and digital threats using advanced AI powered by Groq.',
  keywords: ['cybersecurity', 'AI', 'scam detection', 'phishing', 'family protection'],
  openGraph: {
    title: 'CyberDaddy — AI Cybersecurity Assistant',
    description: 'Protect your family from online threats with AI.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-[#0a0f1e] text-white antialiased font-sans">
        {/* Mobile Top Bar */}
        <TopBar />

        <div className="flex h-screen lg:h-screen overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-64 xl:w-72 flex-shrink-0">
            <Sidebar />
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-hidden flex flex-col min-h-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
