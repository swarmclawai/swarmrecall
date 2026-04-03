import { pool } from '../db/client.js';
import { meili } from './search.js';
import { redisGet } from '../lib/redis.js';
import type { HealthStatus } from '@swarmrecall/shared';

export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, meilisearch, pgvector, redis] = await Promise.all([
    checkPostgres(),
    checkMeilisearch(),
    checkPgvector(),
    checkRedis(),
  ]);

  const allOk = database.ok && meilisearch.ok && pgvector.ok && redis.ok;
  const anyDown = !database.ok || !meilisearch.ok;

  return {
    status: anyDown ? 'down' : allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { database, meilisearch, pgvector, redis },
  };
}

async function checkPostgres(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkMeilisearch(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await meili.health();
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkPgvector(): Promise<{ ok: boolean }> {
  try {
    await pool.query("SELECT 'vector'::regtype");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function checkRedis(): Promise<{ ok: boolean }> {
  try {
    await redisGet('healthcheck');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
