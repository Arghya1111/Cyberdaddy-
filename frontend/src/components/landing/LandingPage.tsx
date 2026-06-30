'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ArrowRight,
  MessageSquare,
  Users,
  ScanLine,
  Bell,
  Brain,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { pricingPlans } from '@/features/payments/plansData';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: ScanLine,
    title: 'Instant Screenshot Scan',
    description:
      'Upload a suspicious message or email screenshot and get an AI risk score in seconds.',
    accent: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  },
  {
    icon: Brain,
    title: 'Groq-Powered Analysis',
    description:
      'Advanced AI explains why something looks like phishing, fraud, or a social-engineering scam.',
    accent: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  },
  {
    icon: Users,
    title: 'Family Protection Hub',
    description:
      'Invite loved ones, share alerts, and monitor family safety from one dashboard.',
    accent: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
  },
  {
    icon: MessageSquare,
    title: 'Chat with CyberDaddy',
    description:
      'Ask anything about online safety — get clear, actionable guidance in plain language.',
    accent: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description:
      'Get notified when a family member encounters a high-risk threat so you can act fast.',
    accent: 'from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description:
      'Your scans and conversations stay encrypted. Built for trust, not surveillance.',
    accent: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create your account',
    description: 'Sign up in under a minute and verify your email to unlock full protection.',
  },
  {
    step: '02',
    title: 'Scan or ask',
    description: 'Drop a screenshot or chat with CyberDaddy about anything suspicious.',
  },
  {
    step: '03',
    title: 'Stay protected',
    description: 'Review risk scores, invite family, and get alerts before scams strike.',
  },
];

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function RevealSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/[0.07] blur-[100px] animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-emerald-500/[0.06] blur-[100px] animate-[float_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30vw] h-[30vw] rounded-full bg-violet-500/[0.04] blur-[80px]" />
      </div>

      {/* Navbar */}
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20'
            : 'bg-transparent',
        )}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-white tracking-tight">CyberDaddy</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-[fade-up_0.8s_ease-out_both]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              AI cybersecurity for the whole family
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
              Stop scams before they{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_4s_linear_infinite]">
                reach your family
              </span>
            </h1>

            <p className="text-lg text-white/50 max-w-xl mb-8 leading-relaxed">
              CyberDaddy scans suspicious screenshots, detects phishing, and guides you
              with an AI assistant — so you and your loved ones stay safe online.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold text-sm hover:opacity-90 transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
              >
                Start free today
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/80 font-semibold text-sm hover:bg-white/10 hover:text-white transition-all"
              >
                I already have an account
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-white/40">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Free tier available
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                256-bit encryption
              </span>
            </div>
          </div>

          {/* Hero preview card */}
          <div className="relative animate-[fade-up_0.8s_ease-out_0.15s_both]">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 blur-2xl opacity-60" />
            <div className="relative rounded-3xl border border-white/10 bg-[#0d1526]/90 backdrop-blur-sm overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <span className="ml-2 text-xs text-white/30">CyberDaddy Scan</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">Uploaded screenshot</p>
                  <p className="text-sm text-white/70 italic">
                    &ldquo;URGENT: Your bank account will be locked. Click here to verify&hellip;&rdquo;
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400 font-semibold text-sm">High Risk — 92/100</span>
                      <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[10px] font-bold uppercase">
                        Phishing
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">
                      Fake urgency, suspicious link, and impersonation of a financial institution detected.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-black" />
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Do not click the link. Report it to your bank directly and delete the message.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to stay safe
            </h2>
            <p className="text-white/45 max-w-2xl mx-auto">
              From quick screenshot scans to family-wide monitoring — CyberDaddy has your back.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <RevealSection key={feature.title} delay={i * 80}>
                <div
                  className={cn(
                    'group h-full p-6 rounded-2xl border bg-gradient-to-br backdrop-blur-sm',
                    'hover:border-white/20 hover:-translate-y-1 transition-all duration-300',
                    feature.accent,
                  )}
                >
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{feature.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Protected in three simple steps
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((item, i) => (
              <RevealSection key={item.step} delay={i * 100}>
                <div className="relative text-center md:text-left">
                  {i < STEPS.length - 1 && (
                    <div
                      className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-white/10 to-transparent"
                      aria-hidden="true"
                    />
                  )}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-white/10 text-2xl font-bold text-cyan-400 mb-5">
                    {item.step}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{item.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Plans for every household
            </h2>
            <p className="text-white/45 max-w-xl mx-auto">
              Start free and upgrade when you need more scans, family seats, or enterprise features.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pricingPlans.map((plan, i) => (
              <RevealSection key={plan.id} delay={i * 80}>
                <div
                  className={cn(
                    'relative flex flex-col h-full p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1',
                    plan.highlighted
                      ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-xl shadow-cyan-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                  )}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-[10px] font-bold uppercase tracking-wide">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                  <p className="text-xs text-white/40 mt-1 mb-4">{plan.description}</p>
                  <div className="mb-5">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">₹{plan.price}</span>
                        <span className="text-white/30 text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/50">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                      plan.highlighted
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black hover:opacity-90'
                        : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    Get started
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <RevealSection>
          <div className="max-w-4xl mx-auto text-center rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 p-10 md:p-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/30">
              <Shield className="w-7 h-7 text-black" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to protect your family?
            </h2>
            <p className="text-white/45 mb-8 max-w-lg mx-auto">
              Join CyberDaddy today and get instant AI-powered protection against scams,
              phishing, and digital threats.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold hover:opacity-90 transition-all shadow-xl shadow-cyan-500/25 hover:-translate-y-0.5"
            >
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold text-white/80">CyberDaddy</span>
          </div>
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} CyberDaddy. Protecting families from digital threats.
          </p>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/login" className="hover:text-white/60 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-white/60 transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
