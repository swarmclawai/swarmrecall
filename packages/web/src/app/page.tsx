import Link from 'next/link';

const features = [
  {
    title: 'Memory',
    description:
      'Semantic vector search across everything your agent has ever stored. Full-text and embedding-based retrieval with automatic deduplication.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: 'Knowledge',
    description:
      'Build a knowledge graph that connects entities, concepts, and relationships. Your agents understand context, not just keywords.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="5" cy="12" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M7 11.5L17 6.5" />
        <path d="M7 12.5L17 17.5" />
      </svg>
    ),
  },
  {
    title: 'Learnings',
    description:
      'Pattern extraction from agent interactions. Auto-distill repeated successes and failures into reusable insights.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    title: 'Skills',
    description:
      'A registry of agent capabilities. Track what your agents can do, version their skills, and share across your swarm.',
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

const steps = [
  {
    num: '01',
    title: 'Install the skill',
    description:
      'Add the SwarmRecall skill to your agent from ClawHub. One click, zero configuration.',
  },
  {
    num: '02',
    title: 'Agent auto-registers',
    description:
      'On first use, your agent registers itself with SwarmRecall and receives a unique identity.',
  },
  {
    num: '03',
    title: 'Claim your dashboard',
    description:
      'Your agent gives you a claim code. Enter it at swarmrecall.ai/claim to link your dashboard.',
  },
];

const skills = [
  'swarmrecall-memory',
  'swarmrecall-knowledge',
  'swarmrecall-learnings',
  'swarmrecall-skills',
  'swarmrecall-agent',
  'swarmrecall-full',
];

export default function HomePage() {
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
              href="#features"
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
            <a
              href="https://clawhub.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
            >
              ClawHub
            </a>
            <Link
              href="/login"
              className="text-sm font-medium text-[#08080d] bg-[#6366F1] hover:bg-[#818CF8] px-4 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-28 pb-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 mb-6 border border-white/[0.07] bg-[#13131e]/80 text-[#818CF8] backdrop-blur-sm px-3 py-1 rounded-full text-sm">
            Now available on ClawHub
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.08] mb-6 max-w-4xl mx-auto">
            Your agents{' '}
            <span className="gradient-text">remember everything.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#7a7a96] max-w-2xl mx-auto mb-10 leading-relaxed">
            Memory, knowledge, learnings, and skills as a service for AI agents.
            Give your swarm persistent context that survives across sessions,
            providers, and platforms.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://clawhub.ai/skills/swarmrecall"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-8 text-base font-semibold rounded-xl bg-[#6366F1] hover:bg-[#818CF8] transition-all shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:shadow-[0_0_40px_rgba(99,102,241,0.35)] flex items-center justify-center text-white"
            >
              Install from ClawHub
            </a>
            <Link
              href="/docs"
              className="h-12 px-8 text-base font-semibold rounded-xl border border-white/[0.1] bg-transparent hover:bg-white/[0.04] text-[#e2e2ec] transition-colors flex items-center justify-center"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-28 border-y border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white mb-4">
              Up and running in three steps
            </h2>
            <p className="text-[#7a7a96] text-lg max-w-xl mx-auto">
              No API keys to configure upfront. Your agent handles registration
              automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="glass-card rounded-2xl p-8 h-full">
                  <div className="font-mono text-5xl font-bold text-[#6366F1]/20 mb-4">
                    {step.num}
                  </div>
                  <h3 className="font-display font-semibold text-white text-lg mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[#7a7a96] text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="relative z-10 py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white mb-4">
              Four pillars of agent intelligence
            </h2>
            <p className="text-[#7a7a96] text-lg max-w-xl mx-auto">
              Everything your agents need to build long-term understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-6 hover:border-white/[0.1] transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#818CF8] mb-4 group-hover:bg-[#6366F1]/15 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-display font-semibold text-white text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#7a7a96] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code example */}
      <section className="relative z-10 py-28 border-y border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white mb-4">
              Simple SDK, powerful results
            </h2>
            <p className="text-[#7a7a96] text-lg max-w-xl mx-auto">
              A few lines of code give your agent permanent memory.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden glow-indigo-sm">
              <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F43F5E]/60" />
                <div className="w-2 h-2 rounded-full bg-[#FBBF24]/60" />
                <div className="w-2 h-2 rounded-full bg-[#34D399]/60" />
                <span className="ml-2 text-[10px] text-[#42425c] font-mono">
                  agent.ts
                </span>
              </div>
              <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto">
                <code>
                  <span className="text-[#7a7a96]">
                    {`import { SwarmRecall } from '@swarmrecall/sdk';\n\n`}
                  </span>
                  <span className="text-[#818CF8]">const</span>
                  {` recall = `}
                  <span className="text-[#818CF8]">new</span>
                  {` SwarmRecall({\n  apiKey: process.env.`}
                  <span className="text-[#34D399]">SWARMRECALL_API_KEY</span>
                  {`,\n});\n\n`}
                  <span className="text-[#42425c]">
                    {`// Store a memory\n`}
                  </span>
                  <span className="text-[#818CF8]">await</span>
                  {` recall.memory.`}
                  <span className="text-[#34D399]">store</span>
                  {`({\n  content: `}
                  <span className="text-[#FBBF24]">{`"User prefers dark mode"`}</span>
                  {`,\n  tags: [`}
                  <span className="text-[#FBBF24]">{`"preference"`}</span>
                  {`, `}
                  <span className="text-[#FBBF24]">{`"ui"`}</span>
                  {`],\n});\n\n`}
                  <span className="text-[#42425c]">
                    {`// Search memories semantically\n`}
                  </span>
                  <span className="text-[#818CF8]">const</span>
                  {` results = `}
                  <span className="text-[#818CF8]">await</span>
                  {` recall.memory.`}
                  <span className="text-[#34D399]">search</span>
                  {`(`}
                  <span className="text-[#FBBF24]">{`"user preferences"`}</span>
                  {`);`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-medium tracking-widest uppercase text-[#42425c] mb-4">
            Available on ClawHub
          </p>
          <p className="text-center text-2xl sm:text-3xl font-display font-bold text-white mb-10">
            Replacing{' '}
            <span className="gradient-text">500k+ ClawHub skill downloads</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {skills.map((skill) => (
              <div
                key={skill}
                className="flex items-center gap-2.5 text-[#7a7a96]/60 hover:text-[#7a7a96] transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-[#6366F1]/30" />
                <span className="text-sm font-mono tracking-wide">{skill}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm text-[#42425c]">
              <Link
                href="/docs"
                className="text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
              >
                Docs
              </Link>
              <a
                href="https://clawhub.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
              >
                ClawHub
              </a>
              <a
                href="https://github.com/swarmrecall"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
              >
                GitHub
              </a>
              <Link
                href="/pricing"
                className="text-[#7a7a96] hover:text-[#e2e2ec] transition-colors"
              >
                Pricing
              </Link>
            </div>
            <span className="text-xs text-[#42425c]">swarmrecall.ai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
