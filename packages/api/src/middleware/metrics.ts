import type { Context, Next } from 'hono';
import { db } from '../db/client.js';
import { apiMetrics } from '../db/schema.js';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function normalizePath(path: string): string {
  return path.replace(UUID_RE, ':id');
}

export async function metricsMiddleware(c: Context, next: Next) {
  // Skip health checks to avoid noise
  if (c.req.path === '/api/v1/health') {
    return next();
  }

  const start = performance.now();
  await next();
  const durationMs = Math.round(performance.now() - start);

  const auth = c.get('auth') as
    | { agentId?: string; ownerId?: string }
    | undefined;

  // Fire-and-forget — never block the response
  db.insert(apiMetrics)
    .values({
      method: c.req.method,
      path: normalizePath(c.req.path),
      statusCode: c.res.status,
      durationMs,
      agentId: auth?.agentId ?? null,
      ownerId: auth?.ownerId ?? null,
    })
    .then(() => {})
    .catch(() => {});
}
