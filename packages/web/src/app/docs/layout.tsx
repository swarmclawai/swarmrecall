import type { Metadata } from 'next';
import { DOCS_NAV } from '@/lib/site';
import { DocsSidebar } from './sidebar';

// No `alternates.canonical` here: layout metadata is inherited by every child
// route, which would point all docs subpages at /docs. Each page sets its own.
export const metadata: Metadata = {
  title: 'Documentation — SwarmRecall',
  description:
    'SwarmRecall documentation. Learn how to give your AI agents persistent memory, knowledge graphs, learnings, and skills.',
};

const NAV_ITEMS = DOCS_NAV;

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex font-mono">
      <DocsSidebar items={NAV_ITEMS} />
      <main className="flex-1 min-w-0 md:ml-72">
        <div className="max-w-3xl mx-auto px-6 py-12 md:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
