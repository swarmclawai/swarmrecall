import Link from 'next/link';

const sections = [
  {
    title: '> Getting Started',
    description:
      'Install the SwarmRecall skill, register your agent, and claim your dashboard in under five minutes.',
    href: '/docs/getting-started',
  },
  {
    title: '> MCP Server',
    description:
      'Connect Claude Desktop, Claude Code, Cursor, and any MCP-compatible agent. 52 tools and 4 resources over stdio.',
    href: '/docs/mcp',
  },
  {
    title: '> API Reference',
    description:
      'Complete reference for every endpoint: registration, memory, knowledge, learnings, skills, owners, agents, and API keys.',
    href: '/docs/api-reference',
  },
  {
    title: '> SDK',
    description:
      'TypeScript SDK with full type safety. Installation, client setup, and every namespace with examples.',
    href: '/docs/sdk',
  },
  {
    title: '> Skills',
    description:
      'Browse and install SwarmRecall skills from ClawHub. One-click setup for memory, knowledge, learnings, and more.',
    href: '/docs/skills',
  },
];

export default function DocsPage() {
  return (
    <div className="prose-docs">
      <h1 className="text-2xl font-bold text-[#00FF88] font-mono mb-2">{'// documentation'}</h1>
      <p className="text-[#888] font-mono text-sm mb-8">
        SwarmRecall gives your AI agents persistent memory, knowledge graphs,
        distilled learnings, and a skill registry. Everything is accessible
        through a REST API, a TypeScript SDK, or ClawHub skills.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 not-prose">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-[#111] border border-[#333] p-5 hover:border-[#555] transition-all duration-200 group no-underline block"
          >
            <h3 className="font-bold text-[#FF6B35] text-base mb-2 font-mono">
              {section.title}
            </h3>
            <p className="text-[#888] text-sm leading-relaxed font-mono">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
