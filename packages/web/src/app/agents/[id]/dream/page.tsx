'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface DreamCycle {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  trigger: 'manual' | 'scheduled' | 'api';
  operations: string[];
  results?: Record<string, Record<string, number>>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
}

interface DreamConfig {
  id: string;
  agentId: string;
  enabled: string;
  intervalHours: number;
  operations: string[];
  thresholds: Record<string, unknown>;
  lastDreamAt?: string;
}

interface DreamListResponse {
  data: DreamCycle[];
  total: number;
  limit: number;
  offset: number;
}

interface Agent {
  id: string;
  name: string;
}

const statusBadgeClass: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  running: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
};

function formatDuration(startedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatOperationName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function renderResultSummary(
  operation: string,
  data: Record<string, number>,
): string {
  switch (operation) {
    case 'decay_prune':
      return `Decayed: ${data.decayed ?? 0}, Pruned: ${data.pruned ?? 0}`;
    case 'deduplicate':
      return `Clusters: ${data.clusters ?? 0}, Merged: ${data.merged ?? 0}`;
    case 'consolidate_entities':
      return `Orphans removed: ${data.orphansRemoved ?? 0}`;
    default: {
      const entries = Object.entries(data);
      if (entries.length === 0) return 'No data';
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
    }
  }
}

export default function DreamPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [latestCycle, setLatestCycle] = useState<DreamCycle | null>(null);
  const [history, setHistory] = useState<DreamCycle[]>([]);
  const [config, setConfig] = useState<DreamConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [agentResult, latestResult, historyResult, configResult] =
        await Promise.allSettled([
          apiFetch<Agent>(`/agents/${agentId}`, token),
          apiFetch<DreamListResponse>(
            `/agents/${agentId}/dream?limit=1`,
            token,
          ),
          apiFetch<DreamListResponse>(
            `/agents/${agentId}/dream?limit=20`,
            token,
          ),
          apiFetch<DreamConfig>(`/agents/${agentId}/dream/config`, token),
        ]);

      if (agentResult.status === 'fulfilled') {
        setAgent(agentResult.value);
      }

      if (latestResult.status === 'fulfilled') {
        const cycles = latestResult.value.data ?? [];
        setLatestCycle(cycles.length > 0 ? cycles[0] : null);
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value.data ?? []);
      }

      if (configResult.status === 'fulfilled') {
        setConfig(configResult.value);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dream data');
    } finally {
      setLoading(false);
    }
  }, [agentId, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDreamNow = async () => {
    setTriggering(true);
    setError('');
    try {
      const token = await getToken();
      await apiFetch(`/agents/${agentId}/dream`, token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to trigger dream';
      if (message.includes('409') || message.toLowerCase().includes('already running')) {
        setError('A dream cycle is already running for this agent.');
      } else {
        setError(message);
      }
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/agents" className="hover:text-gray-900">
            Agents
          </Link>
          <span>/</span>
          <Link href={`/agents/${agentId}`} className="hover:text-gray-900">
            {agent?.name ?? 'Agent'}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Dream</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dream</h1>
            <p className="mt-1 text-sm text-gray-500">
              Memory consolidation and maintenance
            </p>
          </div>
          <button
            onClick={handleDreamNow}
            disabled={triggering}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {triggering ? 'Starting...' : 'Dream Now'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Section 1: Last Dream Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Last Dream Cycle
          </h2>
          {latestCycle ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[latestCycle.status] ?? statusBadgeClass.pending}`}
                >
                  {latestCycle.status}
                </span>
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {latestCycle.trigger}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
                {latestCycle.startedAt && (
                  <span>
                    Started: {new Date(latestCycle.startedAt).toLocaleString()}
                  </span>
                )}
                {latestCycle.completedAt && (
                  <span>
                    Completed:{' '}
                    {new Date(latestCycle.completedAt).toLocaleString()}
                  </span>
                )}
                {latestCycle.startedAt && latestCycle.completedAt && (
                  <span>
                    Duration:{' '}
                    {formatDuration(
                      latestCycle.startedAt,
                      latestCycle.completedAt,
                    )}
                  </span>
                )}
              </div>
              {latestCycle.error && (
                <p className="text-xs text-red-600">{latestCycle.error}</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              No dream cycles recorded yet.
            </p>
          )}
        </div>

        {/* Section 2: Results Summary */}
        {latestCycle?.results && Object.keys(latestCycle.results).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Results Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(latestCycle.results).map(([operation, data]) => (
                <div
                  key={operation}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <p className="text-xs font-medium text-gray-500">
                    {formatOperationName(operation)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {renderResultSummary(operation, data)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Dream Config */}
        {config && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Dream Configuration
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-dream</span>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    config.enabled === 'true'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {config.enabled === 'true' ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Interval</span>
                <span className="text-sm text-gray-900">
                  {config.intervalHours} hours
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Operations</span>
                <div className="flex flex-wrap gap-1">
                  {(config.operations as string[]).length > 0 ? (
                    (config.operations as string[]).map((op) => (
                      <span
                        key={op}
                        className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                      >
                        {formatOperationName(op)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">None configured</span>
                  )}
                </div>
              </div>
              {config.lastDreamAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last dream</span>
                  <span className="text-xs text-gray-400">
                    {new Date(config.lastDreamAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 4: Dream History */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Dream History</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No dream cycles recorded yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Trigger</th>
                    <th className="pb-2 pr-4">Operations</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((cycle) => (
                    <tr key={cycle.id}>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass[cycle.status] ?? statusBadgeClass.pending}`}
                        >
                          {cycle.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600">
                        {cycle.trigger}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600">
                        {(cycle.operations as string[]).join(', ') || '-'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-400">
                        {new Date(cycle.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {cycle.startedAt && cycle.completedAt
                          ? formatDuration(cycle.startedAt, cycle.completedAt)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
