'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  agentId?: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface CreateKeyResponse {
  id: string;
  key: string;
  name: string;
}

const availableScopes = [
  'memory:read',
  'memory:write',
  'knowledge:read',
  'knowledge:write',
  'learnings:read',
  'learnings:write',
  'skills:read',
  'skills:write',
  'agents:read',
  'agents:write',
];

export default function ApiKeysPage() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [agentId, setAgentId] = useState('');

  // Newly created key
  const [newKey, setNewKey] = useState<CreateKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    try {
      const token = await getToken();
      const data = await apiFetch<{ keys: ApiKey[] }>('/api-keys', token);
      setKeys(data.keys ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [getToken]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const token = await getToken();
      const result = await apiFetch<CreateKeyResponse>('/api-keys', token, {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          scopes: selectedScopes,
          ...(agentId ? { agentId } : {}),
        }),
      });
      setNewKey(result);
      setNewName('');
      setSelectedScopes([]);
      setAgentId('');
      setShowForm(false);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return;
    }
    try {
      const token = await getToken();
      await apiFetch(`/api-keys/${keyId}`, token, { method: 'DELETE' });
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-gray-900">
            Settings
          </Link>
          <span>/</span>
          <span className="text-gray-900">API Keys</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage API keys for programmatic access
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setNewKey(null);
            }}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {showForm ? 'Cancel' : 'Create Key'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Newly created key banner */}
        {newKey && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-green-900">
                API Key Created
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Copy this key now. You will not be able to see it again.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white border border-green-200 px-4 py-2.5 text-sm font-mono text-gray-900 break-all">
                {newKey.key}
              </code>
              <button
                onClick={() => copyKey(newKey.key)}
                className="shrink-0 rounded-lg border border-green-300 bg-white px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Create New API Key
            </h2>

            <div>
              <label
                htmlFor="key-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Key Name
              </label>
              <input
                id="key-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                placeholder="e.g. Production Key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableScopes.map((scope) => (
                  <label
                    key={scope}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      selectedScopes.includes(scope)
                        ? 'border-gray-900 bg-gray-50 text-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selectedScopes.includes(scope)
                          ? 'border-gray-900 bg-gray-900'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedScopes.includes(scope) && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="font-mono text-xs">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="key-agent"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Agent ID{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="key-agent"
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                placeholder="Restrict to a specific agent"
              />
            </div>

            <button
              type="submit"
              disabled={creating || selectedScopes.length === 0}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {creating ? 'Creating...' : 'Create API Key'}
            </button>
          </form>
        )}

        {/* Key list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">
              No API keys yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {keys.map((key) => (
              <div key={key.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {key.name}
                    </h3>
                    <p className="mt-1 text-xs font-mono text-gray-500">
                      {key.keyPrefix}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Revoke
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                  {key.lastUsedAt && (
                    <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                  )}
                  {key.agentId && <span>Agent: {key.agentId}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
