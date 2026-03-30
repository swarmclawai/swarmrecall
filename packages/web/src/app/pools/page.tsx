'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Pool {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export default function PoolsPage() {
  const { getToken } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadPools = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await apiFetch<{ data: Pool[] }>('/manage/pools', token);
      setPools(data.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadPools();
  }, [loadPools]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const token = await getToken();
      await apiFetch('/manage/pools', token, {
        method: 'POST',
        body: JSON.stringify({ name: newName, description: newDescription }),
      });
      setNewName('');
      setNewDescription('');
      setShowForm(false);
      await loadPools();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create pool');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pools</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage shared resource pools for your agents
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {showForm ? 'Cancel' : 'Create Pool'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Create pool form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Create New Pool
            </h2>
            <div>
              <label
                htmlFor="pool-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name
              </label>
              <input
                id="pool-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                placeholder="My Pool"
              />
            </div>
            <div>
              <label
                htmlFor="pool-desc"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="pool-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none resize-none"
                placeholder="What is this pool for?"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {creating ? 'Creating...' : 'Create Pool'}
            </button>
          </form>
        )}

        {/* Pool list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-500">
              No pools yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pools.map((pool) => (
              <Link
                key={pool.id}
                href={`/pools/${pool.id}`}
                className="rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <h3 className="text-sm font-semibold text-gray-900">
                  {pool.name}
                </h3>
                {pool.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                    {pool.description}
                  </p>
                )}
                <p className="mt-4 text-xs text-gray-400">
                  Created {new Date(pool.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
