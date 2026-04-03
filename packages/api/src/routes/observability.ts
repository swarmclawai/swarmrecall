import { Hono } from 'hono';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import {
  getUsageMetrics,
  getApiMetricsSummary,
  getSearchMetricsSummary,
  getStorageBreakdown,
  getAuditLogs,
  getHealthStatus,
} from '../services/observability.js';
import { ObservabilityTimeRangeSchema, AuditLogQuerySchema } from '@swarmrecall/shared';

const observabilityRouter = new Hono();

// GET /usage — Usage growth over time
observabilityRouter.get('/usage', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const { hours } = ObservabilityTimeRangeSchema.parse({ hours: c.req.query('hours') });
  const metrics = await getUsageMetrics(auth.ownerId, hours);
  return c.json(metrics);
});

// GET /api-metrics — API request metrics summary
observabilityRouter.get('/api-metrics', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const { hours } = ObservabilityTimeRangeSchema.parse({ hours: c.req.query('hours') });
  const metrics = await getApiMetricsSummary(auth.ownerId, hours);
  return c.json(metrics);
});

// GET /search-metrics — Search performance metrics
observabilityRouter.get('/search-metrics', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const { hours } = ObservabilityTimeRangeSchema.parse({ hours: c.req.query('hours') });
  const metrics = await getSearchMetricsSummary(auth.ownerId, hours);
  return c.json(metrics);
});

// GET /storage — Storage breakdown
observabilityRouter.get('/storage', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const breakdown = await getStorageBreakdown(auth.ownerId);
  return c.json(breakdown);
});

// GET /health — Deep health check
observabilityRouter.get('/health', async (c) => {
  const health = await getHealthStatus();
  return c.json(health);
});

// GET /audit-logs — Paginated audit log
observabilityRouter.get('/audit-logs', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const query = AuditLogQuerySchema.parse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
    eventType: c.req.query('eventType'),
    actorId: c.req.query('actorId'),
    targetType: c.req.query('targetType'),
  });
  const result = await getAuditLogs(auth.ownerId, query);
  return c.json(result);
});

export default observabilityRouter;
