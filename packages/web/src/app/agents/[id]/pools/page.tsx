'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type AccessLevel = 'none' | 'read' | 'readwrite';

interface Agent {
  id: string;
  name: string;
}

interface Pool {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface PoolMember {
  agentId: string;
  agentName: string;
  memoryAccess: AccessLevel;
  knowledgeAccess: AccessLevel;
  learningsAccess: AccessLevel;
  skillsAccess: AccessLevel;
}

interface PoolWithMembers extends Pool {
  members: PoolMember[];
}

interface AgentPool {
  pool: Pool;
  membership: PoolMember;
}

const accessBadgeClass: Record<AccessLevel, string> = {
  none: 'bg-gray-100 text-gray-600',
  read: 'bg-blue-50 text-blue-700',
  readwrite: 'bg-green-50 text-green-700',
};

export default function AgentPoolsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentPools, setAgentPools] = useState<AgentPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();

      // Fetch agent detail and all pools in parallel
      const [agentResult, poolsResult] = await Promise.allSettled([
        apiFetch<Agent>(`/agents/${agentId}`, token),
        apiFetch<{ data: Pool[] }>('/manage/pools', token),
      ]);

      if (agentResult.status === 'fulfilled') {
        setAgent(agentResult.value);
      } else {
        setError('Agent not found');
        return;
      }

      if (poolsResult.status !== 'fulfilled') {
        setError('Failed to load pools');
        return;
      }

      const pools = poolsResult.value.data ?? [];

      // Fetch detail for each pool to get members
      const detailResults = await Promise.allSettled(
        pools.map((pool) =>
          apiFetch<PoolWithMembers>(`/manage/pools/${pool.id}`, token),
        ),
      );

      // Filter to pools where this agent is a member
      const matched: AgentPool[] = [];
      for (const result of detailResults) {
        if (result.status !== 'fulfilled') continue;
        const poolData = result.value;
        const membership = (poolData.members ?? []).find(
          (m) => m.agentId === agentId,
        );
        if (membership) {
          matched.push({
            pool: {
              id: poolData.id,
              name: poolData.name,
              description: poolData.description,
              createdAt: poolData.createdAt,
            },
            membership,
          });
        }
      }

      setAgentPools(matched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [agentId, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          <span className="text-gray-900">Pools</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared Pools</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pools this agent belongs to
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pool list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : agentPools.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              This agent doesn&apos;t belong to any pools yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {agentPools.map(({ pool, membership }) => (
              <div
                key={pool.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/pools/${pool.id}`}
                      className="text-sm font-semibold text-gray-900 hover:underline"
                    >
                      {pool.name}
                    </Link>
                    {pool.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {pool.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[membership.memoryAccess]}`}
                  >
                    Memory: {membership.memoryAccess}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[membership.knowledgeAccess]}`}
                  >
                    Knowledge: {membership.knowledgeAccess}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[membership.learningsAccess]}`}
                  >
                    Learnings: {membership.learningsAccess}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[membership.skillsAccess]}`}
                  >
                    Skills: {membership.skillsAccess}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
