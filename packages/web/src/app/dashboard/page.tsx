'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface Stats {
  agentCount: number;
  totalMemories: number;
  totalLearnings: number;
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats>({
    agentCount: 0,
    totalMemories: 0,
    totalLearnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [agentsData, statsData] = await Promise.allSettled([
          apiFetch<{ agents: Agent[] }>('/agents', token),
          apiFetch<Stats>('/stats', token),
        ]);

        if (agentsData.status === 'fulfilled') {
          setAgents(agentsData.value.agents ?? []);
        }
        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your SwarmRecall workspace
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Agents</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.agentCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Total Memories</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalMemories}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Total Learnings</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalLearnings}
          </p>
        </div>
      </div>

      {/* Recent agents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Agents</h2>
          <Link
            href="/agents"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            View all
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No agents yet.</p>
            <Link
              href="/agents"
              className="mt-3 inline-block text-sm font-medium text-gray-900 hover:underline"
            >
              Create your first agent
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {agents.slice(0, 5).map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {agent.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created {new Date(agent.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    agent.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {agent.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
