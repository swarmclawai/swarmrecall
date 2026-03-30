'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { ENTITY_TYPES } from '@swarmrecall/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface Entity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  poolId?: string;
  poolName?: string;
  createdAt: string;
}

interface Relation {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  relation: string;
  poolId?: string;
  poolName?: string;
  createdAt: string;
}

const entityTypes = ['all', ...ENTITY_TYPES];

export default function KnowledgePage() {
  const params = useParams();
  const { getToken } = useAuth();
  const agentId = params.id as string;

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'entities' | 'relations'>('entities');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (typeFilter !== 'all') queryParams.set('type', typeFilter);
      const qs = queryParams.toString();

      const [entityData, relationData] = await Promise.allSettled([
        apiFetch<{ data: Entity[] }>(
          `/agents/${agentId}/knowledge/entities${qs ? `?${qs}` : ''}`,
          token,
        ),
        apiFetch<{ data: Relation[] }>(
          `/agents/${agentId}/knowledge/relations`,
          token,
        ),
      ]);

      if (entityData.status === 'fulfilled') {
        setEntities(entityData.value.data ?? []);
      }
      if (relationData.status === 'fulfilled') {
        setRelations(relationData.value.data ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge');
    } finally {
      setLoading(false);
    }
  }, [agentId, getToken, search, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]));

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
          <span className="text-gray-900">Knowledge</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Graph</h1>
          <p className="mt-1 text-sm text-gray-500">
            Entities and relations extracted by the agent
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
            onClick={() => setActiveTab('entities')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'entities'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Entities
          </button>
          <button
            onClick={() => setActiveTab('relations')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'relations'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Relations
          </button>
        </div>

        {activeTab === 'entities' && (
          <>
            {/* Search and filter */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                  placeholder="Search entities..."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                />
              </form>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
              >
                {entityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t === 'all' ? 'All types' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : entities.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No entities found.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="px-6 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {entity.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {entity.type}
                        </span>
                        {entity.poolName && (
                          <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                            {entity.poolName}
                          </span>
                        )}
                      </div>
                    </div>
                    {Object.keys(entity.properties).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(entity.properties).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Added {new Date(entity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'relations' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : relations.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No relations found.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {relations.map((relation) => (
                  <div
                    key={relation.id}
                    className="px-6 py-4"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-medium text-gray-900">
                        {entityNames.get(relation.fromEntityId) ?? relation.fromEntityId.slice(0, 8)}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {relation.relation}
                      </span>
                      <span className="font-medium text-gray-900">
                        {entityNames.get(relation.toEntityId) ?? relation.toEntityId.slice(0, 8)}
                      </span>
                      {relation.poolName && (
                        <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {relation.poolName}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Added {new Date(relation.createdAt).toLocaleDateString()}
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
