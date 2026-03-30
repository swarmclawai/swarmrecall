'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { LEARNING_CATEGORIES, LEARNING_PRIORITIES, LEARNING_STATUSES } from '@swarmrecall/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface Learning {
  id: string;
  summary: string;
  details?: string | null;
  category: string;
  status: string;
  priority: string;
  poolId?: string;
  poolName?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pattern {
  id: string;
  patternSummary: string;
  recurrenceCount: number;
  poolId?: string;
  poolName?: string;
  lastSeenAt: string;
}

const categoryOptions = ['all', ...LEARNING_CATEGORIES];
const statusOptions = ['all', ...LEARNING_STATUSES];
const priorityOptions = ['all', ...LEARNING_PRIORITIES];

export default function LearningsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const agentId = params.id as string;

  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'learnings' | 'patterns'>('learnings');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'all') queryParams.set('category', categoryFilter);
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      if (priorityFilter !== 'all') queryParams.set('priority', priorityFilter);
      const qs = queryParams.toString();

      const [learningsData, patternsData] = await Promise.allSettled([
        apiFetch<{ data: Learning[] }>(
          `/agents/${agentId}/learnings${qs ? `?${qs}` : ''}`,
          token,
        ),
        apiFetch<{ data: Pattern[] }>(
          `/agents/${agentId}/learnings/patterns`,
          token,
        ),
      ]);

      if (learningsData.status === 'fulfilled') {
        setLearnings(learningsData.value.data ?? []);
      }
      if (patternsData.status === 'fulfilled') {
        setPatterns(patternsData.value.data ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load learnings');
    } finally {
      setLoading(false);
    }
  }, [agentId, getToken, categoryFilter, statusFilter, priorityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high':
        return 'bg-red-50 text-red-700';
      case 'medium':
        return 'bg-amber-50 text-amber-700';
      case 'low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'resolved':
        return 'bg-green-50 text-green-700';
      case 'promoted':
        return 'bg-blue-50 text-blue-700';
      case 'wont_fix':
        return 'bg-gray-100 text-gray-500';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
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
          <span className="text-gray-900">Learnings</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learnings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Patterns, insights, and accumulated knowledge
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
            onClick={() => setActiveTab('learnings')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'learnings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Learnings
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'patterns'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Patterns
          </button>
        </div>

        {activeTab === 'learnings' && (
          <>
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All categories' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All priorities' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : learnings.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No learnings found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {learnings.map((learning) => (
                  <div
                    key={learning.id}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {learning.summary}
                    </p>
                    {learning.details && (
                      <p className="mt-2 text-sm text-gray-500 whitespace-pre-wrap">
                        {learning.details}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {learning.category}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(learning.status)}`}
                      >
                        {learning.status}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(learning.priority)}`}
                      >
                        {learning.priority}
                      </span>
                      {learning.poolName && (
                        <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {learning.poolName}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(learning.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'patterns' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : patterns.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No patterns detected yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="rounded-xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {pattern.patternSummary}
                        </h3>
                      </div>
                      <span className="shrink-0 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {pattern.recurrenceCount} occurrences
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Last seen {new Date(pattern.lastSeenAt).toLocaleString()}
                    </p>
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
