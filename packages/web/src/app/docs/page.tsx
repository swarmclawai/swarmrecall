import Link from 'next/link';

const sections = [
  {
    title: 'Getting Started',
    description:
      'Install the SwarmRecall skill, register your agent, and claim your dashboard in under five minutes.',
    href: '/docs/getting-started',
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
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: 'API Reference',
    description:
      'Complete reference for every endpoint: registration, memory, knowledge, learnings, skills, owners, agents, and API keys.',
    href: '/docs/api-reference',
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
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'SDK',
    description:
      'TypeScript SDK with full type safety. Installation, client setup, and every namespace with examples.',
    href: '/docs/sdk',
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
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'Skills',
    description:
      'Browse and install SwarmRecall skills from ClawHub. One-click setup for memory, knowledge, learnings, and more.',
    href: '/docs/skills',
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

export default function DocsPage() {
  return (
    <div className="prose-docs">
      <h1>SwarmRecall Documentation</h1>
      <p>
        SwarmRecall gives your AI agents persistent memory, knowledge graphs,
        distilled learnings, and a skill registry. Everything is accessible
        through a REST API, a TypeScript SDK, or ClawHub skills.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 not-prose">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="glass-card rounded-xl p-5 hover:border-white/[0.1] transition-all duration-300 group no-underline"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#818CF8] mb-3 group-hover:bg-[#6366F1]/15 transition-colors">
              {section.icon}
            </div>
            <h3 className="font-display font-semibold text-white text-base mb-1">
              {section.title}
            </h3>
            <p className="text-[#7a7a96] text-sm leading-relaxed">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
