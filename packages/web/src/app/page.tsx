import type { Metadata } from 'next';
import Link from 'next/link';
import { NetworkDropdown } from '@/components/NetworkDropdown';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const GITHUB_URL = 'https://github.com/swarmclawai/swarmrecall';
const SELF_HOST_URL =
  'https://github.com/swarmclawai/swarmrecall/blob/main/docs/self-hosting.md';
const DISCORD_URL = 'https://discord.gg/sbEavS8cPV';

const features = [
  {
    prefix: '// Memory',
    description:
      'Semantic vector search across everything your agent has ever stored. Full-text and embedding-based retrieval with automatic deduplication.',
  },
  {
    prefix: '// Knowledge',
    description:
      'Build a knowledge graph that connects entities, concepts, and relationships. Your agents understand context, not just keywords.',
  },
  {
    prefix: '// Learnings',
    description:
      'Pattern extraction from agent interactions. Auto-distill repeated successes and failures into reusable insights.',
  },
  {
    prefix: '// Skills',
    description:
      'A registry of agent capabilities. Track what your agents can do, version their skills, and share across your swarm.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Clone the repo',
    description:
      'Pull SwarmRecall from GitHub. It is a pnpm + Turborepo monorepo: API, dashboard, SDK, and CLI.',
  },
  {
    num: '02',
    title: 'Run the stack',
    description:
      'docker compose up brings up Postgres + pgvector and Meilisearch. pnpm dev starts the API on :3300.',
  },
  {
    num: '03',
    title: 'Point your agents at it',
    description:
      'Set SWARMRECALL_API_URL to your instance. The SDK and CLI default to http://localhost:3300.',
  },
];

const ecosystemLinks = [
  { href: 'https://www.swarmclaw.ai', label: 'SwarmClaw' },
  { href: 'https://www.swarmdock.ai', label: 'SwarmDock' },
  { href: 'https://www.swarmfeed.ai', label: 'SwarmFeed' },
  { href: 'https://www.swarmrelay.ai', label: 'SwarmRelay' },
  { href: 'https://www.swarmvault.ai', label: 'SwarmVault' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-body overflow-x-hidden">
      {/* ── Nav ──────────────────────────────────── */}
      <nav className="relative z-20 border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-mono font-bold text-lg tracking-tight text-[#E0E0E0]">
              Swarm<span className="text-[#00FF88]">Recall</span>
            </span>
            <span className="w-1.5 h-1.5 bg-[#00FF88] inline-block" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm text-[#888] hover:text-[#E0E0E0] transition-colors font-mono"
            >
              Features
            </Link>
            <Link
              href="/docs"
              className="text-sm text-[#888] hover:text-[#E0E0E0] transition-colors font-mono"
            >
              Docs
            </Link>
            <a
              href={SELF_HOST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#888] hover:text-[#E0E0E0] transition-colors font-mono"
            >
              Self-Host
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#888] hover:text-[#E0E0E0] transition-colors font-mono"
            >
              Discord
            </a>
            <NetworkDropdown />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono font-medium text-[#00FF88] border border-[#00FF88] px-4 py-1.5 hover:bg-[#00FF88] hover:text-[#0A0A0A] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative z-10 pt-32 pb-36 scanlines">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <p className="text-sm font-mono text-[#555] mb-6 tracking-wide">
            $ git clone swarmclawai/swarmrecall
          </p>

          <div className="inline-flex items-center gap-2 mb-6 border border-[#00FF88]/40 bg-[#00FF88]/5 px-3 py-1">
            <span className="w-1.5 h-1.5 bg-[#00FF88] inline-block" />
            <span className="text-xs font-mono tracking-wide text-[#00FF88]">
              NOW OPEN SOURCE · SELF-HOST ONLY
            </span>
          </div>

          <h1 className="font-mono font-bold text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] mb-4 max-w-4xl">
            <span className="text-[#00FF88]">&gt;</span> Long-term memory for
            your <span className="cursor-blink">agents</span>
          </h1>

          <p className="text-base sm:text-lg text-[#888] max-w-2xl mb-8 leading-relaxed font-body">
            Memory, knowledge, learnings, and skills for AI agents. Persistent
            context that survives across sessions, providers, and platforms —
            open-source and yours to run.
          </p>

          <p className="text-sm text-[#666] max-w-2xl mb-12 leading-relaxed font-body">
            The hosted SwarmRecall service has been discontinued. The full
            stack is open-source: clone it, run it, own your data.
          </p>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-8 text-sm font-mono font-semibold bg-[#00FF88] text-[#0A0A0A] border border-[#00FF88] hover:bg-transparent hover:text-[#00FF88] transition-colors flex items-center justify-center"
            >
              View on GitHub
            </a>
            <a
              href={SELF_HOST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-8 text-sm font-mono font-semibold border border-[#333] text-[#E0E0E0] hover:border-[#555] transition-colors flex items-center justify-center"
            >
              Self-Host It
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-8 text-sm font-mono font-semibold border border-[#333] text-[#E0E0E0] hover:border-[#555] transition-colors flex items-center justify-center"
            >
              Join Discord
            </a>
          </div>
        </div>
      </section>

      {/* ── Get started ──────────────────────────── */}
      <section className="relative z-10 py-24 border-y border-[#333]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <h2 className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-[#E0E0E0] mb-3">
              <span className="text-[#555]">#</span> Run your own instance
            </h2>
            <p className="text-[#888] text-sm font-body max-w-lg">
              Self-hosting takes three steps. Everything runs locally with
              Docker — no managed service required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#333] border border-[#333]">
            {steps.map((step) => (
              <div key={step.num} className="bg-[#111] p-6">
                <div className="font-mono text-sm text-[#00FF88] mb-3">
                  <span className="text-[#555]">&gt;</span> {step.num}
                </div>
                <h3 className="font-mono font-semibold text-[#E0E0E0] text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-[#888] text-sm leading-relaxed font-body">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────── */}
      <section id="features" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <h2 className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-[#E0E0E0] mb-3">
              <span className="text-[#555]">#</span> Four pillars of agent
              intelligence
            </h2>
            <p className="text-[#888] text-sm font-body max-w-lg">
              Everything your agents need to build long-term understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#333] border border-[#333]">
            {features.map((feature) => (
              <div key={feature.prefix} className="bg-[#111] p-6">
                <h3 className="font-mono font-bold text-[#00FF88] text-lg mb-3">
                  {feature.prefix}
                </h3>
                <p className="text-[#888] text-sm leading-relaxed font-body">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Code example ─────────────────────────── */}
      <section className="relative z-10 py-24 border-y border-[#333]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <h2 className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-[#E0E0E0] mb-3">
              <span className="text-[#555]">$</span> Simple SDK, powerful
              results
            </h2>
            <p className="text-[#888] text-sm font-body max-w-lg">
              A few lines of code give your agent permanent memory — pointed at
              your own instance.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="border border-[#333] bg-[#0A0A0A]">
              {/* Title bar */}
              <div className="px-4 py-2.5 border-b border-[#333] flex items-center gap-2">
                <span className="w-3 h-3 bg-[#FF4444] inline-block" />
                <span className="w-3 h-3 bg-[#FF6B35] inline-block" />
                <span className="w-3 h-3 bg-[#00FF88] inline-block" />
                <span className="ml-3 text-xs text-[#555] font-mono">
                  terminal
                </span>
              </div>
              {/* Code content */}
              <pre className="p-6 text-sm leading-relaxed font-mono overflow-x-auto">
                <code>
                  <span className="text-[#555]">
                    {`// Initialize SwarmRecall\n`}
                  </span>
                  <span className="text-[#FF6B35]">import</span>
                  {` { SwarmRecallClient } `}
                  <span className="text-[#FF6B35]">from</span>
                  <span className="text-[#00FF88]">
                    {` '@swarmrecall/sdk'`}
                  </span>
                  {`;\n\n`}
                  <span className="text-[#FF6B35]">const</span>
                  {` recall = `}
                  <span className="text-[#FF6B35]">new</span>
                  {` SwarmRecallClient({\n  apiKey: process.env.`}
                  <span className="text-[#00FF88]">SWARMRECALL_API_KEY</span>
                  {`,\n  baseUrl: process.env.`}
                  <span className="text-[#00FF88]">SWARMRECALL_API_URL</span>
                  {`, `}
                  <span className="text-[#555]">{`// → http://localhost:3300`}</span>
                  {`\n});\n\n`}
                  <span className="text-[#555]">
                    {`// Store a memory\n`}
                  </span>
                  <span className="text-[#FF6B35]">await</span>
                  {` recall.memory.`}
                  <span className="text-[#00FF88]">store</span>
                  {`({\n  content: `}
                  <span className="text-[#FF6B35]">{`"User prefers dark mode"`}</span>
                  {`,\n  category: `}
                  <span className="text-[#FF6B35]">{`"preference"`}</span>
                  {`,\n});\n\n`}
                  <span className="text-[#555]">
                    {`// Search memories semantically\n`}
                  </span>
                  <span className="text-[#FF6B35]">const</span>
                  {` results = `}
                  <span className="text-[#FF6B35]">await</span>
                  {` recall.memory.`}
                  <span className="text-[#00FF88]">search</span>
                  {`(`}
                  <span className="text-[#FF6B35]">{`"user preferences"`}</span>
                  {`);`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Open source CTA ──────────────────────── */}
      <section className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-mono tracking-[0.2em] uppercase text-[#555] mb-4">
            {'// open source'}
          </p>
          <p className="text-xl sm:text-2xl font-mono font-bold text-[#888] mb-8">
            MIT licensed. <span className="text-[#00FF88]">Self-host it</span>,
            fork it, make it yours.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-8 text-sm font-mono font-semibold bg-[#00FF88] text-[#0A0A0A] border border-[#00FF88] hover:bg-transparent hover:text-[#00FF88] transition-colors flex items-center justify-center"
            >
              Star on GitHub
            </a>
            <a
              href={SELF_HOST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-8 text-sm font-mono font-semibold border border-[#333] text-[#E0E0E0] hover:border-[#555] transition-colors flex items-center justify-center"
            >
              Read the Self-Hosting Guide
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#333] py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8 text-sm font-mono">
              <span className="text-[#555]">SwarmRecall</span>
              <Link
                href="/docs"
                className="text-[#888] hover:text-[#E0E0E0] transition-colors"
              >
                Docs
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#888] hover:text-[#E0E0E0] transition-colors"
              >
                GitHub
              </a>
              <a
                href={SELF_HOST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#888] hover:text-[#E0E0E0] transition-colors"
              >
                Self-Host
              </a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-mono">
              <span className="text-[#555] uppercase tracking-[0.18em] text-[10px]">
                Related Products
              </span>
              {ecosystemLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[#888] hover:text-[#E0E0E0] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <span className="text-xs text-[#555] font-mono">
              &copy; {new Date().getFullYear()} SwarmRecall · MIT
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
