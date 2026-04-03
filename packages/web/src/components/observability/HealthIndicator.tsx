'use client';

import type { HealthStatus } from '@swarmrecall/shared';

export function HealthIndicator({ health }: { health: HealthStatus | null }) {
  if (!health) {
    return (
      <div className="terminal-card flex items-center gap-3">
        <div className="h-3 w-3 bg-[#555] animate-pulse" />
        <span className="text-sm text-[#888] font-mono">Checking services...</span>
      </div>
    );
  }

  const services = [
    { name: 'PostgreSQL', ok: health.services.database.ok, latency: health.services.database.latencyMs },
    { name: 'Meilisearch', ok: health.services.meilisearch.ok, latency: health.services.meilisearch.latencyMs },
    { name: 'pgvector', ok: health.services.pgvector.ok },
    { name: 'Redis', ok: health.services.redis.ok },
  ];

  const statusColor = health.status === 'ok' ? '#00FF88' : health.status === 'degraded' ? '#FF6B35' : '#FF4444';

  return (
    <div className="terminal-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#E0E0E0] font-mono">System Health</h3>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5" style={{ backgroundColor: statusColor }} />
          <span className="text-xs font-mono uppercase" style={{ color: statusColor }}>
            {health.status}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center gap-2 p-2 bg-[#0A0A0A] border border-[#333]">
            <div
              className="h-2 w-2 shrink-0"
              style={{ backgroundColor: svc.ok ? '#00FF88' : '#FF4444' }}
            />
            <div className="min-w-0">
              <p className="text-xs font-mono text-[#E0E0E0] truncate">{svc.name}</p>
              {svc.latency !== undefined && (
                <p className="text-xs font-mono text-[#555]">{svc.latency}ms</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
