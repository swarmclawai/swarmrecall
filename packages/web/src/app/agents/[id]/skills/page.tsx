'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Skill {
  id: string;
  name: string;
  description?: string | null;
  version?: string | null;
  source?: string | null;
  status: string;
  invocationCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

export default function SkillsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const agentId = params.id as string;

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<{ data: Skill[] }>(
          `/agents/${agentId}/skills`,
          token,
        );
        setSkills(data.data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentId, getToken]);

  const statusColor = (s: string) => {
    switch (s) {
      case 'active':
        return 'bg-green-50 text-green-700';
      case 'disabled':
        return 'bg-gray-100 text-gray-500';
      case 'error':
        return 'bg-red-50 text-red-700';
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
          <span className="text-gray-900">Skills</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
          <p className="mt-1 text-sm text-gray-500">
            Installed capabilities and their usage
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : skills.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">No skills installed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {skill.name}
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(skill.status)}`}
                  >
                    {skill.status}
                  </span>
                </div>
                {skill.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                    {skill.description}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Version</span>
                    <span className="font-mono text-gray-700">{skill.version}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-700">{skill.source ?? 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Invocations</span>
                    <span className="font-medium text-gray-900">
                      {skill.invocationCount.toLocaleString()}
                    </span>
                  </div>
                  {skill.lastUsedAt && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Last used</span>
                      <span className="text-gray-700">
                        {new Date(skill.lastUsedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  Installed {new Date(skill.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
