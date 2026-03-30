import { eq, and, or, isNull, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { memories, memorySessions } from '../db/schema.js';
import { generateEmbedding, generateQueryEmbedding } from '../lib/embeddings.js';
import { searchIndex } from './search.js';
import { logAuditEvent } from './audit.js';
import {
  getReadablePoolIds,
  validatePoolWrite,
  annotatePoolNames,
  resolvePoolNames,
  validatePoolsWriteScope,
} from './poolAccess.js';
import type { MemoryCreate, MemoryUpdate, MemoryList, SessionUpdate } from '@swarmrecall/shared';

type SearchableMemoryRow = Pick<
  typeof memories.$inferSelect,
  'id' | 'ownerId' | 'agentId' | 'content' | 'category' | 'tags' | 'poolId' | 'archivedAt'
>;

type MemorySearchHit = { id: string; _rankingScore?: number; rankingScore?: number };
type PublicMemoryRow = Pick<
  typeof memories.$inferSelect,
  | 'id'
  | 'agentId'
  | 'ownerId'
  | 'content'
  | 'category'
  | 'importance'
  | 'tags'
  | 'metadata'
  | 'sessionId'
  | 'poolId'
  | 'archivedAt'
  | 'createdAt'
  | 'updatedAt'
>;

const PUBLIC_MEMORY_SELECT = {
  id: memories.id,
  agentId: memories.agentId,
  ownerId: memories.ownerId,
  content: memories.content,
  category: memories.category,
  importance: memories.importance,
  tags: memories.tags,
  metadata: memories.metadata,
  sessionId: memories.sessionId,
  poolId: memories.poolId,
  archivedAt: memories.archivedAt,
  createdAt: memories.createdAt,
  updatedAt: memories.updatedAt,
} as const;

function buildMemoryAccessCondition(agentId: string, readablePoolIds: string[]) {
  return readablePoolIds.length > 0
    ? or(
        and(eq(memories.agentId, agentId), isNull(memories.poolId)),
        inArray(memories.poolId, readablePoolIds),
      )!
    : and(eq(memories.agentId, agentId), isNull(memories.poolId))!;
}

function buildMemorySearchFilter(ownerId: string, agentId: string, readablePoolIds: string[]) {
  const privateFilter = `(agentId = "${agentId}" AND poolId IS NULL)`;
  if (readablePoolIds.length === 0) {
    return `ownerId = "${ownerId}" AND ${privateFilter}`;
  }

  const poolFilter = readablePoolIds.map((id) => `poolId = "${id}"`).join(' OR ');
  return `ownerId = "${ownerId}" AND (${privateFilter} OR ${poolFilter})`;
}

function getTextScore(hit: MemorySearchHit) {
  return hit._rankingScore ?? hit.rankingScore ?? 0.5;
}

function toSearchableMemory(row: PublicMemoryRow) {
  return {
    id: row.id,
    agentId: row.agentId,
    ownerId: row.ownerId,
    content: row.content,
    category: row.category,
    importance: row.importance,
    tags: row.tags,
    metadata: row.metadata,
    sessionId: row.sessionId,
    poolId: row.poolId,
    poolName: null as string | null,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function syncMemorySearchDocument(row: SearchableMemoryRow) {
  if (row.archivedAt) {
    await searchIndex.removeDocument('memories', row.id);
    return;
  }

  await searchIndex.indexDocument('memories', {
    id: row.id,
    ownerId: row.ownerId,
    agentId: row.agentId,
    poolId: row.poolId,
    content: row.content,
    category: row.category,
    tags: row.tags,
  });
}

// ---------------------------------------------------------------------------
// Memories
// ---------------------------------------------------------------------------

export async function storeMemory(agentId: string, ownerId: string, data: MemoryCreate, scopes?: string[]) {
  if (data.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, data.poolId, 'memory');
  }

  const embedding = await generateEmbedding(data.content);

  const [row] = await db
    .insert(memories)
    .values({
      agentId,
      ownerId,
      content: data.content,
      category: data.category,
      importance: data.importance,
      tags: data.tags,
      metadata: data.metadata ?? null,
      embedding: embedding.length > 0 ? embedding : null,
      sessionId: data.sessionId ?? null,
      poolId: data.poolId ?? null,
    })
    .returning();

  // Index in Meilisearch (fire-and-forget)
  syncMemorySearchDocument(row);

  // Audit log (fire-and-forget)
  logAuditEvent({
    eventType: 'memory.created',
    actorId: agentId,
    targetId: row.id,
    targetType: 'memory',
    ownerId,
    payload: { category: row.category, poolId: data.poolId },
  });

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function listMemories(agentId: string, ownerId: string, filters: MemoryList) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'memory');
  const agentCondition = buildMemoryAccessCondition(agentId, readablePoolIds);

  const conditions = [
    eq(memories.ownerId, ownerId),
    agentCondition,
  ];

  if (!filters.includeArchived) {
    conditions.push(isNull(memories.archivedAt));
  }
  if (filters.category) {
    conditions.push(eq(memories.category, filters.category));
  }
  if (filters.sessionId) {
    conditions.push(eq(memories.sessionId, filters.sessionId));
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memories)
      .where(and(...conditions)),
  ]);

  const annotated = await annotatePoolNames(data);
  return { data: annotated, total: countResult[0].count, limit: filters.limit, offset: filters.offset };
}

export async function searchMemories(
  agentId: string,
  ownerId: string,
  query: string,
  limit: number,
  minScore: number,
) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'memory');
  const embedding = await generateQueryEmbedding(query);
  const agentCondition = buildMemoryAccessCondition(agentId, readablePoolIds);

  // Vector search
  let vectorResults: Array<PublicMemoryRow & { score: number }> = [];

  if (embedding.length > 0) {
    const vectorStr = `[${embedding.join(',')}]`;
    vectorResults = await db
      .select({
        ...PUBLIC_MEMORY_SELECT,
        score: sql<number>`1 - (${memories.embedding} <=> ${vectorStr})`,
      })
      .from(memories)
      .where(
        and(
          eq(memories.ownerId, ownerId),
          agentCondition,
          isNull(memories.archivedAt),
          sql`${memories.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(sql`${memories.embedding} <=> ${vectorStr}`)
      .limit(limit);
  }

  const textResults = await searchIndex.searchDocuments(
    'memories',
    query,
    buildMemorySearchFilter(ownerId, agentId, readablePoolIds),
    limit,
  );

  const textScores = new Map(
    (textResults.hits as MemorySearchHit[]).map((hit) => [hit.id, getTextScore(hit)]),
  );

  const merged = vectorResults
    .map((r) => ({
      data: toSearchableMemory(r),
      score: Math.max(r.score, textScores.get(r.id) ?? 0),
    }))
    .filter((r) => r.score >= minScore);

  const mergedIds = new Set(merged.map((r) => r.data.id));
  const textOnlyIds = (textResults.hits as MemorySearchHit[])
    .map((hit) => hit.id)
    .filter((id) => !mergedIds.has(id));

  if (textOnlyIds.length > 0) {
    const textRows = await db
      .select(PUBLIC_MEMORY_SELECT)
      .from(memories)
      .where(
        and(
          eq(memories.ownerId, ownerId),
          agentCondition,
          isNull(memories.archivedAt),
          inArray(memories.id, textOnlyIds),
        ),
      );

    const textRowMap = new Map(textRows.map((row) => [row.id, row]));

    for (const id of textOnlyIds) {
      const row = textRowMap.get(id);
      if (!row) continue;
      const score = textScores.get(id) ?? 0.5;
      if (score >= minScore) {
        merged.push({ data: toSearchableMemory(row), score });
      }
    }
  }

  merged.sort((a, b) => b.score - a.score);

  // Annotate pool names
  const poolIds = [...new Set(merged.filter((r) => r.data.poolId).map((r) => r.data.poolId!))];
  if (poolIds.length > 0) {
    const names = await resolvePoolNames(poolIds);
    for (const r of merged) {
      if (r.data.poolId) r.data.poolName = names.get(r.data.poolId) ?? null;
    }
  }

  return merged.slice(0, limit);
}

export async function getMemory(id: string, agentId: string, ownerId: string) {
  const [row] = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.id, id),
        eq(memories.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Check access: private data belongs to the agent; pool data requires membership.
  if (row.poolId) {
    const readable = await getReadablePoolIds(agentId, ownerId, 'memory');
    if (!readable.includes(row.poolId)) return null;
  } else if (row.agentId !== agentId) {
    return null;
  }

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function updateMemory(
  id: string,
  agentId: string,
  ownerId: string,
  data: MemoryUpdate,
  scopes?: string[],
) {
  // Check if this is pool data that requires write access
  const existing = await getMemory(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'memory');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.importance !== undefined) updates.importance = data.importance;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.metadata !== undefined) updates.metadata = data.metadata;
  if (data.archived === true) updates.archivedAt = new Date();
  if (data.archived === false) updates.archivedAt = null;

  const [row] = await db
    .update(memories)
    .set(updates)
    .where(
      and(
        eq(memories.id, id),
        eq(memories.ownerId, ownerId),
      ),
    )
    .returning();

  if (row) {
    await syncMemorySearchDocument(row);
    const [annotated] = await annotatePoolNames([row]);
    return annotated;
  }

  return null;
}

export async function archiveMemory(id: string, agentId: string, ownerId: string, scopes?: string[]) {
  // Check if this is pool data that requires write access
  const existing = await getMemory(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'memory');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const [row] = await db
    .update(memories)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(memories.id, id),
        eq(memories.ownerId, ownerId),
      ),
    )
    .returning();

  if (row) {
    await syncMemorySearchDocument(row);
    logAuditEvent({
      eventType: 'memory.archived',
      actorId: agentId,
      targetId: id,
      targetType: 'memory',
      ownerId,
    });
  }

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function startSession(
  agentId: string,
  ownerId: string,
  context?: Record<string, unknown>,
  poolId?: string,
  scopes?: string[],
) {
  if (poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, poolId, 'memory');
  }

  const [row] = await db
    .insert(memorySessions)
    .values({
      agentId,
      ownerId,
      context: context ?? null,
      poolId: poolId ?? null,
    })
    .returning();

  logAuditEvent({
    eventType: 'session.started',
    actorId: agentId,
    targetId: row.id,
    targetType: 'session',
    ownerId,
  });

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function updateSession(
  id: string,
  agentId: string,
  ownerId: string,
  data: SessionUpdate,
  scopes?: string[],
) {
  const [existing] = await db
    .select({
      id: memorySessions.id,
      agentId: memorySessions.agentId,
      ownerId: memorySessions.ownerId,
      poolId: memorySessions.poolId,
    })
    .from(memorySessions)
    .where(
      and(
        eq(memorySessions.id, id),
        eq(memorySessions.ownerId, ownerId),
        eq(memorySessions.agentId, agentId),
      ),
    )
    .limit(1);

  if (!existing) return null;
  if (existing.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'memory');
  }

  const updates: Record<string, unknown> = {};

  if (data.currentState !== undefined) updates.currentState = data.currentState;
  if (data.summary !== undefined) updates.summary = data.summary;
  if (data.ended === true) updates.endedAt = new Date();

  if (Object.keys(updates).length === 0) return null;

  const [row] = await db
    .update(memorySessions)
    .set(updates)
    .where(
      and(
        eq(memorySessions.id, existing.id),
        eq(memorySessions.ownerId, existing.ownerId),
        eq(memorySessions.agentId, existing.agentId),
      ),
    )
    .returning();

  if (!row) return null;
  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function getCurrentSession(agentId: string, ownerId: string) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'memory');
  const agentCondition = readablePoolIds.length > 0
    ? or(
        and(eq(memorySessions.agentId, agentId), isNull(memorySessions.poolId)),
        inArray(memorySessions.poolId, readablePoolIds),
      )!
    : and(eq(memorySessions.agentId, agentId), isNull(memorySessions.poolId))!;

  const [row] = await db
    .select()
    .from(memorySessions)
    .where(
      and(
        eq(memorySessions.ownerId, ownerId),
        agentCondition,
        isNull(memorySessions.endedAt),
      ),
    )
    .orderBy(desc(memorySessions.startedAt))
    .limit(1);

  if (!row) return null;
  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function listSessions(agentId: string, ownerId: string, limit: number, offset: number) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'memory');
  const agentCondition = readablePoolIds.length > 0
    ? or(
        and(eq(memorySessions.agentId, agentId), isNull(memorySessions.poolId)),
        inArray(memorySessions.poolId, readablePoolIds),
      )!
    : and(eq(memorySessions.agentId, agentId), isNull(memorySessions.poolId))!;

  const conditions = [
    eq(memorySessions.ownerId, ownerId),
    agentCondition,
  ];

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(memorySessions)
      .where(and(...conditions))
      .orderBy(desc(memorySessions.startedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memorySessions)
      .where(and(...conditions)),
  ]);

  const annotated = await annotatePoolNames(data);
  return { data: annotated, total: countResult[0].count, limit, offset };
}
