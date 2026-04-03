import { and, eq, desc, sql, gte, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { pool } from '../db/client.js';
import {
  memories,
  entities,
  relations,
  learnings,
  agentSkills,
  auditLog,
  apiMetrics,
  searchMetrics,
} from '../db/schema.js';
import { getHealthStatus as getHealth } from './health.js';
import type {
  UsageMetrics,
  ApiMetricsSummary,
  SearchMetricsSummary,
  StorageBreakdown,
  HealthStatus,
  AuditLogEntry,
} from '@swarmrecall/shared';
import type { AuditLogQuery } from '@swarmrecall/shared';

// ---------------------------------------------------------------------------
// Usage Metrics — growth over time
// ---------------------------------------------------------------------------

export async function getUsageMetrics(ownerId: string, hours: number): Promise<UsageMetrics> {
  const since = new Date(Date.now() - hours * 3600_000);

  const [memSeries, entSeries, learnSeries, skillSeries] = await Promise.all([
    db
      .select({
        date: sql<string>`date_trunc('day', ${memories.createdAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(memories)
      .where(and(eq(memories.ownerId, ownerId), gte(memories.createdAt, since), isNull(memories.archivedAt)))
      .groupBy(sql`date_trunc('day', ${memories.createdAt})`)
      .orderBy(sql`date_trunc('day', ${memories.createdAt})`),
    db
      .select({
        date: sql<string>`date_trunc('day', ${entities.createdAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(entities)
      .where(and(eq(entities.ownerId, ownerId), gte(entities.createdAt, since), isNull(entities.archivedAt)))
      .groupBy(sql`date_trunc('day', ${entities.createdAt})`)
      .orderBy(sql`date_trunc('day', ${entities.createdAt})`),
    db
      .select({
        date: sql<string>`date_trunc('day', ${learnings.createdAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(learnings)
      .where(and(eq(learnings.ownerId, ownerId), gte(learnings.createdAt, since), isNull(learnings.archivedAt)))
      .groupBy(sql`date_trunc('day', ${learnings.createdAt})`)
      .orderBy(sql`date_trunc('day', ${learnings.createdAt})`),
    db
      .select({
        date: sql<string>`date_trunc('day', ${agentSkills.createdAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(agentSkills)
      .where(and(eq(agentSkills.ownerId, ownerId), gte(agentSkills.createdAt, since)))
      .groupBy(sql`date_trunc('day', ${agentSkills.createdAt})`)
      .orderBy(sql`date_trunc('day', ${agentSkills.createdAt})`),
  ]);

  // Merge all series into a unified timeline
  const dateMap = new Map<string, { memories: number; entities: number; learnings: number; skills: number }>();

  for (const row of memSeries) {
    const d = row.date;
    const entry = dateMap.get(d) ?? { memories: 0, entities: 0, learnings: 0, skills: 0 };
    entry.memories = row.count;
    dateMap.set(d, entry);
  }
  for (const row of entSeries) {
    const d = row.date;
    const entry = dateMap.get(d) ?? { memories: 0, entities: 0, learnings: 0, skills: 0 };
    entry.entities = row.count;
    dateMap.set(d, entry);
  }
  for (const row of learnSeries) {
    const d = row.date;
    const entry = dateMap.get(d) ?? { memories: 0, entities: 0, learnings: 0, skills: 0 };
    entry.learnings = row.count;
    dateMap.set(d, entry);
  }
  for (const row of skillSeries) {
    const d = row.date;
    const entry = dateMap.get(d) ?? { memories: 0, entities: 0, learnings: 0, skills: 0 };
    entry.skills = row.count;
    dateMap.set(d, entry);
  }

  const series = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return { series };
}

// ---------------------------------------------------------------------------
// API Metrics Summary
// ---------------------------------------------------------------------------

export async function getApiMetricsSummary(ownerId: string, hours: number): Promise<ApiMetricsSummary> {
  const since = new Date(Date.now() - hours * 3600_000);
  const ownerFilter = and(eq(apiMetrics.ownerId, ownerId), gte(apiMetrics.timestamp, since));

  const [summaryRows, byStatusRows, byPathRows, seriesRows] = await Promise.all([
    db
      .select({
        totalRequests: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`coalesce(round(avg(${apiMetrics.durationMs}))::int, 0)`,
        errorCount: sql<number>`count(*) filter (where ${apiMetrics.statusCode} >= 400)::int`,
        p95DurationMs: sql<number>`coalesce(round(percentile_cont(0.95) within group (order by ${apiMetrics.durationMs}))::int, 0)`,
      })
      .from(apiMetrics)
      .where(ownerFilter),
    db
      .select({
        statusCode: apiMetrics.statusCode,
        count: sql<number>`count(*)::int`,
      })
      .from(apiMetrics)
      .where(ownerFilter)
      .groupBy(apiMetrics.statusCode)
      .orderBy(apiMetrics.statusCode),
    db
      .select({
        path: apiMetrics.path,
        count: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`round(avg(${apiMetrics.durationMs}))::int`,
      })
      .from(apiMetrics)
      .where(ownerFilter)
      .groupBy(apiMetrics.path)
      .orderBy(sql`count(*) DESC`)
      .limit(20),
    db
      .select({
        hour: sql<string>`date_trunc('hour', ${apiMetrics.timestamp})::text`,
        count: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`round(avg(${apiMetrics.durationMs}))::int`,
      })
      .from(apiMetrics)
      .where(ownerFilter)
      .groupBy(sql`date_trunc('hour', ${apiMetrics.timestamp})`)
      .orderBy(sql`date_trunc('hour', ${apiMetrics.timestamp})`),
  ]);

  const summary = summaryRows[0] ?? { totalRequests: 0, avgDurationMs: 0, errorCount: 0, p95DurationMs: 0 };

  return {
    totalRequests: summary.totalRequests,
    avgDurationMs: summary.avgDurationMs,
    errorRate: summary.totalRequests > 0 ? summary.errorCount / summary.totalRequests : 0,
    p95DurationMs: summary.p95DurationMs,
    byStatus: byStatusRows,
    byPath: byPathRows,
    series: seriesRows,
  };
}

// ---------------------------------------------------------------------------
// Search Metrics Summary
// ---------------------------------------------------------------------------

export async function getSearchMetricsSummary(ownerId: string, hours: number): Promise<SearchMetricsSummary> {
  const since = new Date(Date.now() - hours * 3600_000);
  const ownerFilter = and(eq(searchMetrics.ownerId, ownerId), gte(searchMetrics.timestamp, since));

  const [summaryRows, byMethodRows, byIndexRows, seriesRows] = await Promise.all([
    db
      .select({
        totalSearches: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`coalesce(round(avg(${searchMetrics.durationMs}))::int, 0)`,
        avgResultCount: sql<number>`coalesce(round(avg(${searchMetrics.resultCount}))::int, 0)`,
      })
      .from(searchMetrics)
      .where(ownerFilter),
    db
      .select({
        method: searchMetrics.method,
        count: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`round(avg(${searchMetrics.durationMs}))::int`,
        avgResultCount: sql<number>`round(avg(${searchMetrics.resultCount}))::int`,
      })
      .from(searchMetrics)
      .where(ownerFilter)
      .groupBy(searchMetrics.method)
      .orderBy(searchMetrics.method),
    db
      .select({
        indexName: searchMetrics.indexName,
        count: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`round(avg(${searchMetrics.durationMs}))::int`,
      })
      .from(searchMetrics)
      .where(ownerFilter)
      .groupBy(searchMetrics.indexName)
      .orderBy(searchMetrics.indexName),
    db
      .select({
        hour: sql<string>`date_trunc('hour', ${searchMetrics.timestamp})::text`,
        count: sql<number>`count(*)::int`,
        avgDurationMs: sql<number>`round(avg(${searchMetrics.durationMs}))::int`,
      })
      .from(searchMetrics)
      .where(ownerFilter)
      .groupBy(sql`date_trunc('hour', ${searchMetrics.timestamp})`)
      .orderBy(sql`date_trunc('hour', ${searchMetrics.timestamp})`),
  ]);

  const summary = summaryRows[0] ?? { totalSearches: 0, avgDurationMs: 0, avgResultCount: 0 };

  return {
    totalSearches: summary.totalSearches,
    avgDurationMs: summary.avgDurationMs,
    avgResultCount: summary.avgResultCount,
    byMethod: byMethodRows,
    byIndex: byIndexRows,
    series: seriesRows,
  };
}

// ---------------------------------------------------------------------------
// Storage Breakdown
// ---------------------------------------------------------------------------

export async function getStorageBreakdown(ownerId: string): Promise<StorageBreakdown> {
  const [memCount, entCount, relCount, learnCount, skillCount, auditCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(memories).where(eq(memories.ownerId, ownerId)),
    db.select({ count: sql<number>`count(*)::int` }).from(entities).where(eq(entities.ownerId, ownerId)),
    db.select({ count: sql<number>`count(*)::int` }).from(relations).where(eq(relations.ownerId, ownerId)),
    db.select({ count: sql<number>`count(*)::int` }).from(learnings).where(eq(learnings.ownerId, ownerId)),
    db.select({ count: sql<number>`count(*)::int` }).from(agentSkills).where(eq(agentSkills.ownerId, ownerId)),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLog).where(eq(auditLog.ownerId, ownerId)),
  ]);

  // Estimate sizes: avg row sizes (KB) based on typical data
  // Embedding vectors are 1536 x float32 = ~6 KB alone
  const estimates = {
    memories: { count: memCount[0].count, avgRowKb: 8 },      // content + embedding (~6KB) + metadata
    entities: { count: entCount[0].count, avgRowKb: 8 },      // name + properties + embedding (~6KB)
    relations: { count: relCount[0].count, avgRowKb: 0.5 },   // two UUIDs + relation name
    learnings: { count: learnCount[0].count, avgRowKb: 8 },   // summary + details + embedding (~6KB)
    skills: { count: skillCount[0].count, avgRowKb: 1 },      // config + triggers
    auditLog: { count: auditCount[0].count, avgRowKb: 0.5 },  // event type + payload
  };

  const toMb = (count: number, avgRowKb: number) =>
    Math.round((count * avgRowKb) / 1024 * 100) / 100;

  const result: StorageBreakdown = {
    memories: { count: estimates.memories.count, estimatedSizeMb: toMb(estimates.memories.count, estimates.memories.avgRowKb) },
    entities: { count: estimates.entities.count, estimatedSizeMb: toMb(estimates.entities.count, estimates.entities.avgRowKb) },
    relations: { count: estimates.relations.count, estimatedSizeMb: toMb(estimates.relations.count, estimates.relations.avgRowKb) },
    learnings: { count: estimates.learnings.count, estimatedSizeMb: toMb(estimates.learnings.count, estimates.learnings.avgRowKb) },
    skills: { count: estimates.skills.count, estimatedSizeMb: toMb(estimates.skills.count, estimates.skills.avgRowKb) },
    auditLog: { count: estimates.auditLog.count, estimatedSizeMb: toMb(estimates.auditLog.count, estimates.auditLog.avgRowKb) },
    totalEstimatedSizeMb: 0,
  };

  result.totalEstimatedSizeMb = Object.values(result)
    .filter((v): v is { count: number; estimatedSizeMb: number } => typeof v === 'object' && v !== null && 'estimatedSizeMb' in v)
    .reduce((sum, v) => sum + v.estimatedSizeMb, 0);
  result.totalEstimatedSizeMb = Math.round(result.totalEstimatedSizeMb * 100) / 100;

  return result;
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export async function getAuditLogs(ownerId: string, query: AuditLogQuery) {
  const conditions = [eq(auditLog.ownerId, ownerId)];

  if (query.eventType) {
    conditions.push(eq(auditLog.eventType, query.eventType));
  }
  if (query.targetType) {
    conditions.push(eq(auditLog.targetType, query.targetType));
  }
  if (query.actorId) {
    conditions.push(eq(auditLog.actorId, query.actorId));
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.timestamp))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(and(...conditions)),
  ]);

  return {
    data,
    total: countResult[0].count,
    limit: query.limit,
    offset: query.offset,
  };
}

// ---------------------------------------------------------------------------
// Health Status
// ---------------------------------------------------------------------------

export { getHealth as getHealthStatus };
