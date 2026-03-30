'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface AgentStats {
  memoryCount: number;
  knowledgeCount: number;
  learningCount: number;
  skillCount: number;
}

const tabs = [
  { name: 'Memory', href: 'memory', description: 'Episodic and session memories' },
  { name: 'Knowledge', href: 'knowledge', description: 'Entities and relations' },
  { name: 'Learnings', href: 'learnings', description: 'Patterns and insights' },
  { name: 'Skills', href: 'skills', description: 'Installed capabilities' },
  { name: 'Pools', href: 'pools', description: 'Shared pool memberships' },
];

export default function AgentDetailPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState<AgentStats>({
    memoryCount: 0,
    knowledgeCount: 0,
    learningCount: 0,
    skillCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const agentId = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [agentData, statsData] = await Promise.allSettled([
          apiFetch<Agent>(`/agents/${agentId}`, token),
          apiFetch<AgentStats>(`/stats/agents/${agentId}`, token),
        ]);

        if (agentData.status === 'fulfilled') {
          setAgent(agentData.value);
        } else {
          setError('Agent not found');
        }

        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentId, getToken]);

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
          <span className="text-gray-900">{agent?.name ?? 'Agent'}</span>
        </nav>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {agent && (
          <>
            {/* Agent header */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {agent.name}
                  </h1>
                  {agent.description && (
                    <p className="mt-1 text-sm text-gray-500">
                      {agent.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Created {new Date(agent.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    agent.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Memories</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats.memoryCount}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Knowledge</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats.knowledgeCount}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Learnings</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats.learningCount}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Skills</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats.skillCount}
                </p>
              </div>
            </div>

            {/* Module tabs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={`/agents/${agentId}/${tab.href}`}
                  className="rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <h3 className="text-sm font-semibold text-gray-900">
                    {tab.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {tab.description}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
