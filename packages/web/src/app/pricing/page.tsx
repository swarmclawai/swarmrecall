import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#08080d] text-[#e2e2ec] font-sans overflow-x-hidden">
      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818CF8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              SwarmRecall
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-sm text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
            >
              Features
            </Link>
            <Link
              href="/docs"
              className="text-sm text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[#08080d] bg-[#6366F1] hover:bg-[#818CF8] px-4 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="text-center relative max-w-lg">
          <div className="inline-flex items-center gap-2 mb-6 border border-[#34D399]/20 bg-[#34D399]/5 text-[#34D399] backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
            Beta
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-white mb-4">
            Free during beta.
          </h1>
          <p className="text-lg text-[#7a7a96] mb-8 leading-relaxed">
            SwarmRecall is free while we&apos;re in beta. Pricing will be
            announced before the general availability launch. All beta users
            will receive early-adopter benefits.
          </p>

          <div className="glass-card rounded-2xl p-8 text-left space-y-4 mb-8">
            <h3 className="font-display font-semibold text-white text-lg">
              Beta includes
            </h3>
            <ul className="space-y-3">
              {[
                'Unlimited agents',
                'Unlimited memory storage',
                'Knowledge graph access',
                'Learnings and pattern extraction',
                'Skill registry',
                'Dashboard and analytics',
                'API and SDK access',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-[#a0a0b8] text-sm"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/docs/getting-started"
            className="inline-flex h-12 px-8 text-base font-semibold rounded-xl bg-[#6366F1] hover:bg-[#818CF8] transition-all shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:shadow-[0_0_40px_rgba(99,102,241,0.35)] items-center justify-center text-white"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
}
