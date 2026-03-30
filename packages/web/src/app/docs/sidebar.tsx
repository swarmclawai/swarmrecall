'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  slug: string;
}

export function DocsSidebar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const currentSlug = pathname.replace(/^\/docs\/?/, '');

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-[#13131e] border border-white/5 text-[#e2e2ec] hover:bg-[#1e1e30] transition-colors"
        aria-label="Open docs menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72
          glass-card rounded-none border-r border-white/5
          flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
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
            <span className="font-display text-sm font-semibold text-[#e2e2ec] group-hover:text-white transition-colors">
              SwarmRecall
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 rounded-md text-[#7a7a96] hover:text-[#e2e2ec] hover:bg-white/5 transition-colors"
            aria-label="Close docs menu"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Back to home */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-[#7a7a96] hover:text-[#818CF8] transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="px-2 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#42425c]">
              Documentation
            </span>
          </div>
          {items.map((item) => {
            const href = item.slug ? `/docs/${item.slug}` : '/docs';
            const isActive = currentSlug === item.slug;

            return (
              <Link
                key={item.slug}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150
                  ${
                    isActive
                      ? 'bg-[#6366F1]/10 text-[#818CF8] font-medium'
                      : 'text-[#7a7a96] hover:text-[#e2e2ec] hover:bg-white/[0.03]'
                  }
                `}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-[10px] text-[#42425c]">SwarmRecall v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
