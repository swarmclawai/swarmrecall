'use client';

import { useState, useRef, useEffect } from 'react';

const ecosystemLinks = [
  { href: 'https://www.swarmclaw.ai', label: 'SwarmClaw' },
  { href: 'https://www.swarmdock.ai', label: 'SwarmDock' },
  { href: 'https://www.swarmfeed.ai', label: 'SwarmFeed' },
  { href: 'https://www.swarmrelay.ai', label: 'SwarmRelay' },
];

export function NetworkDropdown() {
  const [clicked, setClicked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setClicked(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative group" ref={ref}>
      <button
        onClick={() => setClicked((v) => !v)}
        className="cursor-pointer text-sm text-[#888] hover:text-[#00FF88] transition-colors font-mono flex items-center gap-1.5"
      >
        Network
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${clicked ? 'rotate-180' : 'group-hover:rotate-180'}`}
        >
          <path d="M2 4l3 3 3-3" />
        </svg>
      </button>
      <div className={`absolute right-0 top-full pt-1 z-50 ${clicked ? 'block' : 'hidden group-hover:block'}`}>
        <div className="min-w-[160px] border border-[#333] bg-[#111] py-1">
          {ecosystemLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-4 py-2 text-sm text-[#888] hover:text-[#00FF88] hover:bg-[#1a1a1a] transition-colors font-mono"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
