'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AuditLogEntry, PaginatedResponse } from '@swarmrecall/shared';

export default function AuditLogsPage() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ eventType: '', targetType: '' });
  const limit = 25;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = await getToken();
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (filters.eventType) params.set('eventType', filters.eventType);
        if (filters.targetType) params.set('targetType', filters.targetType);

        const result = await apiFetch<PaginatedResponse<AuditLogEntry>>(
          `/observability/audit-logs?${params}`,
          token,
        );
        setLogs(result.data);
        setTotal(result.total);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken, offset, filters]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  function getEventBadgeStyle(eventType: string) {
    if (eventType.includes('created') || eventType.includes('started'))
      return 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30';
    if (eventType.includes('archived') || eventType.includes('deleted'))
      return 'bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/30';
    return 'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/30';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/observability"
              className="text-xs text-[#555] font-mono hover:text-[#888] transition-colors"
            >
              Observability
            </Link>
            <span className="text-xs text-[#555] font-mono">/</span>
          </div>
          <h1 className="text-2xl font-bold text-[#E0E0E0] font-mono">Audit Logs</h1>
          <p className="mt-1 text-sm text-[#555] font-mono">
            {total.toLocaleString()} events recorded
          </p>
        </div>
      </div>

      {error && (
        <div className="terminal-card border-[#FF4444] text-[#FF4444] text-sm font-mono">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          className="bg-[#111] border border-[#333] text-[#E0E0E0] text-xs font-mono px-2 py-1.5 cursor-pointer"
          value={filters.eventType}
          onChange={(e) => { setOffset(0); setFilters({ ...filters, eventType: e.target.value }); }}
        >
          <option value="">All Events</option>
          <option value="memory.created">memory.created</option>
          <option value="memory.archived">memory.archived</option>
          <option value="session.started">session.started</option>
          <option value="entity.created">entity.created</option>
          <option value="entity.archived">entity.archived</option>
          <option value="relation.created">relation.created</option>
          <option value="learning.created">learning.created</option>
          <option value="learning.archived">learning.archived</option>
          <option value="skill.registered">skill.registered</option>
          <option value="agent.created">agent.created</option>
          <option value="agent.deleted">agent.deleted</option>
        </select>

        <select
          className="bg-[#111] border border-[#333] text-[#E0E0E0] text-xs font-mono px-2 py-1.5 cursor-pointer"
          value={filters.targetType}
          onChange={(e) => { setOffset(0); setFilters({ ...filters, targetType: e.target.value }); }}
        >
          <option value="">All Types</option>
          <option value="memory">Memory</option>
          <option value="session">Session</option>
          <option value="entity">Entity</option>
          <option value="relation">Relation</option>
          <option value="learning">Learning</option>
          <option value="skill">Skill</option>
          <option value="agent">Agent</option>
        </select>
      </div>

      {/* Table */}
      <div className="terminal-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333]">
                <th className="text-left text-xs font-medium text-[#00FF88] font-mono px-4 py-3 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="text-left text-xs font-medium text-[#00FF88] font-mono px-4 py-3 uppercase tracking-wider">
                  Event
                </th>
                <th className="text-left text-xs font-medium text-[#00FF88] font-mono px-4 py-3 uppercase tracking-wider">
                  Target
                </th>
                <th className="text-left text-xs font-medium text-[#00FF88] font-mono px-4 py-3 uppercase tracking-wider">
                  Target ID
                </th>
                <th className="text-left text-xs font-medium text-[#00FF88] font-mono px-4 py-3 uppercase tracking-wider">
                  Payload
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#555] font-mono">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#555] font-mono">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1A1A1A] hover:bg-[#111] transition-colors">
                    <td className="px-4 py-2.5 text-xs text-[#888] font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-mono border ${getEventBadgeStyle(log.eventType)}`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#888] font-mono">
                      {log.targetType ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#555] font-mono max-w-[120px] truncate">
                      {log.targetId ?? '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.payload ? (
                        <details className="text-xs font-mono">
                          <summary className="text-[#888] cursor-pointer hover:text-[#E0E0E0]">
                            View
                          </summary>
                          <pre className="mt-1 p-2 bg-[#0A0A0A] border border-[#333] text-[#888] overflow-x-auto max-w-xs">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-[#555] font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#555] font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1 text-xs font-mono border border-[#333] text-[#888] hover:text-[#E0E0E0] hover:bg-[#111] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 text-xs font-mono border border-[#333] text-[#888] hover:text-[#E0E0E0] hover:bg-[#111] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
