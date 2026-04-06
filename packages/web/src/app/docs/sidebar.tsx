'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  title: string;
  slug: string;
}

const ecosystemLinks = [
  { href: 'https://www.swarmclaw.ai', label: 'SwarmClaw' },
  { href: 'https://www.swarmdock.ai', label: 'SwarmDock' },
  { href: 'https://www.swarmfeed.ai', label: 'SwarmFeed' },
  { href: 'https://www.swarmrelay.ai', label: 'SwarmRelay' },
  { href: 'https://www.swarmvault.ai', label: 'SwarmVault' },
];

export function DocsSidebar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const currentSlug = pathname.replace(/^\/docs\/?/, '');

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-[#111] border border-[#333] text-[#E0E0E0] hover:bg-[#1a1a1a] transition-colors"
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
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72
          bg-[#0A0A0A] border-r border-[#333]
          flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#333]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-[#00FF88] text-sm font-mono">$</span>
            <span className="text-sm font-bold text-[#E0E0E0] group-hover:text-white transition-colors font-mono">
              SwarmRecall
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 text-[#888] hover:text-[#E0E0E0] transition-colors"
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
        <div className="px-5 pt-4 pb-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-[#888] hover:text-[#00FF88] transition-colors font-mono"
          >
            &larr; Back to Home
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="px-2 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555] font-mono">
              DOCS
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
                  flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-150 font-mono
                  ${
                    isActive
                      ? 'text-[#00FF88] border-l-2 border-[#00FF88] bg-[#00FF88]/5'
                      : 'text-[#888] hover:text-[#E0E0E0] border-l-2 border-transparent'
                  }
                `}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#333]">
          <div className="mb-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#555] font-mono">
              Network
            </p>
            <div className="flex flex-col gap-2">
              {ecosystemLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs text-[#888] transition-colors hover:text-[#00FF88] font-mono"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-[#555] font-mono">SwarmRecall v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
