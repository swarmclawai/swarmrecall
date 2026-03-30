import { AsyncLocalStorage } from 'node:async_hooks';
import { and, eq, isNull, inArray, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { pools, poolMembers } from '../db/schema.js';
import { HTTPException } from 'hono/http-exception';
import type { PoolDataType } from '@swarmrecall/shared';

const ACCESS_COLUMN_MAP = {
  memory: poolMembers.memoryAccess,
  knowledge: poolMembers.knowledgeAccess,
  learnings: poolMembers.learningsAccess,
  skills: poolMembers.skillsAccess,
} as const;

// ---------------------------------------------------------------------------
// Per-request cache via AsyncLocalStorage
// ---------------------------------------------------------------------------

interface RequestCache {
  readable: Map<string, Promise<string[]>>;
  writable: Map<string, Promise<string[]>>;
}

export const poolCacheStorage = new AsyncLocalStorage<RequestCache>();

function getOrCreateCache(): RequestCache | undefined {
  return poolCacheStorage.getStore();
}

// ---------------------------------------------------------------------------
// Core queries (uncached)
// ---------------------------------------------------------------------------

async function queryReadablePoolIds(
  agentId: string,
  ownerId: string,
  dataType: PoolDataType,
): Promise<string[]> {
  const col = ACCESS_COLUMN_MAP[dataType];
  const rows = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(
      and(
        eq(poolMembers.agentId, agentId),
        eq(poolMembers.ownerId, ownerId),
        or(eq(col, 'read'), eq(col, 'readwrite')),
        isNull(pools.archivedAt),
      ),
    );

  return rows.map((r) => r.poolId);
}

async function queryWritablePoolIds(
  agentId: string,
  ownerId: string,
  dataType: PoolDataType,
): Promise<string[]> {
  const col = ACCESS_COLUMN_MAP[dataType];
  const rows = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(
      and(
        eq(poolMembers.agentId, agentId),
        eq(poolMembers.ownerId, ownerId),
        eq(col, 'readwrite'),
        isNull(pools.archivedAt),
      ),
    );

  return rows.map((r) => r.poolId);
}

// ---------------------------------------------------------------------------
// Public API (uses cache when provided)
// ---------------------------------------------------------------------------

export async function getReadablePoolIds(
  agentId: string,
  ownerId: string,
  dataType: PoolDataType,
): Promise<string[]> {
  const store = getOrCreateCache();
  if (store) {
    const key = `${agentId}:${ownerId}:${dataType}`;
    let p = store.readable.get(key);
    if (!p) {
      p = queryReadablePoolIds(agentId, ownerId, dataType);
      store.readable.set(key, p);
    }
    return p;
  }
  return queryReadablePoolIds(agentId, ownerId, dataType);
}

export async function getWritablePoolIds(
  agentId: string,
  ownerId: string,
  dataType: PoolDataType,
): Promise<string[]> {
  const store = getOrCreateCache();
  if (store) {
    const key = `${agentId}:${ownerId}:${dataType}`;
    let p = store.writable.get(key);
    if (!p) {
      p = queryWritablePoolIds(agentId, ownerId, dataType);
      store.writable.set(key, p);
    }
    return p;
  }
  return queryWritablePoolIds(agentId, ownerId, dataType);
}

export async function validatePoolWrite(
  agentId: string,
  ownerId: string,
  poolId: string,
  dataType: PoolDataType,
): Promise<void> {
  const col = ACCESS_COLUMN_MAP[dataType];
  const [row] = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(
      and(
        eq(poolMembers.poolId, poolId),
        eq(poolMembers.agentId, agentId),
        eq(poolMembers.ownerId, ownerId),
        eq(col, 'readwrite'),
        isNull(pools.archivedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new HTTPException(403, { message: `No write access to pool for ${dataType}` });
  }
}

export async function resolvePoolNames(poolIds: string[]): Promise<Map<string, string>> {
  if (poolIds.length === 0) return new Map();

  const rows = await db
    .select({ id: pools.id, name: pools.name })
    .from(pools)
    .where(inArray(pools.id, poolIds));

  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Annotate rows that have a poolId with the corresponding poolName. */
export async function annotatePoolNames<T extends { poolId: string | null }>(
  rows: T[],
): Promise<(T & { poolName: string | null })[]> {
  const poolIds = [...new Set(rows.filter((r) => r.poolId).map((r) => r.poolId!))];
  const names = await resolvePoolNames(poolIds);
  return rows.map((r) => ({
    ...r,
    poolName: r.poolId ? (names.get(r.poolId) ?? null) : null,
  }));
}
