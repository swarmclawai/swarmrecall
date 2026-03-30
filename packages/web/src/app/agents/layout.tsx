'use client';

import { DashboardShell } from '@/components/DashboardShell';
import type { ReactNode } from 'react';

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
