'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { MEMORY_CATEGORIES } from '@swarmrecall/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  sessionId?: string;
  poolId?: string;
  poolName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  startedAt: string;
  endedAt?: string;
  summary?: string | null;
  currentState?: Record<string, unknown> | null;
}

const categories = ['all', ...MEMORY_CATEGORIES];

export default function MemoryPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const agentId = params.id as string;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'memories' | 'sessions'>('memories');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (category !== 'all') queryParams.set('category', category);
      const qs = queryParams.toString();

      const [memData, sessionData] = await Promise.allSettled([
        apiFetch<{ data: Memory[] }>(
          `/agents/${agentId}/memory${qs ? `?${qs}` : ''}`,
          token,
        ),
        apiFetch<{ data: Session[] }>(
          `/agents/${agentId}/memory/sessions`,
          token,
        ),
      ]);

      if (memData.status === 'fulfilled') {
        setMemories(memData.value.data ?? []);
      }
      if (sessionData.status === 'fulfilled') {
        setSessions(sessionData.value.data ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [agentId, getToken, search, category]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

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
            Agent
          </Link>
          <span>/</span>
          <span className="text-gray-900">Memory</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search agent memories
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
          <button
            onClick={() => setActiveTab('memories')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'memories'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Memories
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sessions
          </button>
        </div>

        {activeTab === 'memories' && (
          <>
            {/* Search and filter */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search memories..."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                />
              </form>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All categories' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Memory list */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : memories.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No memories found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {memory.content}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {memory.category}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            memory.importance >= 0.7
                              ? 'bg-amber-50 text-amber-700'
                              : memory.importance >= 0.4
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {Math.round(memory.importance * 100)}%
                        </span>
                        {memory.poolName && (
                          <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                            {memory.poolName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        Created {new Date(memory.createdAt).toLocaleString()}
                      </span>
                      {memory.sessionId && (
                        <span>Session: {memory.sessionId.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'sessions' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No sessions found.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Session {session.id.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        Started{' '}
                        {new Date(session.startedAt).toLocaleString()}
                        {session.endedAt &&
                          ` - Ended ${new Date(session.endedAt).toLocaleString()}`}
                      </p>
                      {session.summary && (
                        <p className="mt-1 text-sm text-gray-500">
                          {session.summary}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      {session.endedAt ? 'Closed' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
