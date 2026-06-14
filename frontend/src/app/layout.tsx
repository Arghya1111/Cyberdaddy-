import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

// Root layout provides the HTML shell and AuthProvider only.
// Each route group ((auth) and (app)) handles its own layout.
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="bg-[#0a0f1e] text-white antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
