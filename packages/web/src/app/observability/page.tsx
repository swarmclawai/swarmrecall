'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HealthIndicator } from '@/components/observability/HealthIndicator';
import { UsageChart } from '@/components/observability/UsageChart';
import { ApiMetricsChart } from '@/components/observability/ApiMetricsChart';
import { SearchPerfChart } from '@/components/observability/SearchPerfChart';
import { StorageBreakdownChart } from '@/components/observability/StorageBreakdown';
import type {
  HealthStatus,
  UsageMetrics,
  ApiMetricsSummary,
  SearchMetricsSummary,
  StorageBreakdown,
} from '@swarmrecall/shared';

export default function ObservabilityPage() {
  const { getToken } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetricsSummary | null>(null);
  const [searchMetrics, setSearchMetrics] = useState<SearchMetricsSummary | null>(null);
  const [storage, setStorage] = useState<StorageBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hours, setHours] = useState(24);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [h, u, a, s, st] = await Promise.allSettled([
          apiFetch<HealthStatus>('/observability/health', token),
          apiFetch<UsageMetrics>(`/observability/usage?hours=${hours}`, token),
          apiFetch<ApiMetricsSummary>(`/observability/api-metrics?hours=${hours}`, token),
          apiFetch<SearchMetricsSummary>(`/observability/search-metrics?hours=${hours}`, token),
          apiFetch<StorageBreakdown>('/observability/storage', token),
        ]);

        if (h.status === 'fulfilled') setHealth(h.value);
        if (u.status === 'fulfilled') setUsage(u.value);
        if (a.status === 'fulfilled') setApiMetrics(a.value);
        if (s.status === 'fulfilled') setSearchMetrics(s.value);
        if (st.status === 'fulfilled') setStorage(st.value);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load observability data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken, hours]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-b-2 border-[#00FF88]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E0E0E0] font-mono">Observability</h1>
          <p className="mt-1 text-sm text-[#555] font-mono">
            System health, usage analytics, and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#888] font-mono">Time range:</label>
          <select
            value={hours}
            onChange={(e) => { setLoading(true); setHours(Number(e.target.value)); }}
            className="bg-[#111] border border-[#333] text-[#E0E0E0] text-xs font-mono px-2 py-1 cursor-pointer"
          >
            <option value={1}>1h</option>
            <option value={6}>6h</option>
            <option value={24}>24h</option>
            <option value={72}>3d</option>
            <option value={168}>7d</option>
            <option value={720}>30d</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="terminal-card border-[#FF4444] text-[#FF4444] text-sm font-mono">
          {error}
        </div>
      )}

      {/* Health Status */}
      <HealthIndicator health={health} />

      {/* Usage Growth */}
      <UsageChart data={usage} />

      {/* API Metrics */}
      <ApiMetricsChart data={apiMetrics} />

      {/* Search + Storage side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SearchPerfChart data={searchMetrics} />
        <StorageBreakdownChart data={storage} />
      </div>

      {/* Link to Audit Logs */}
      <div className="terminal-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#E0E0E0] font-mono">Audit Trail</h3>
            <p className="text-xs text-[#555] font-mono mt-1">
              View the full history of create, update, and delete operations
            </p>
          </div>
          <Link
            href="/observability/audit-logs"
            className="px-3 py-1.5 text-xs font-mono text-[#00FF88] border border-[#00FF88]/30 hover:bg-[#00FF88]/10 transition-colors"
          >
            View Audit Logs
          </Link>
        </div>
      </div>
    </div>
  );
}
