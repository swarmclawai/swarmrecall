import { eq, and, or, isNull, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { memories, memorySessions } from '../db/schema.js';
import { generateEmbedding, generateQueryEmbedding } from '../lib/embeddings.js';
import { searchIndex } from './search.js';
import { logAuditEvent } from './audit.js';
import { getReadablePoolIds, validatePoolWrite, annotatePoolNames, resolvePoolNames } from './poolAccess.js';
import type { MemoryCreate, MemoryUpdate, MemoryList, SessionUpdate } from '@swarmrecall/shared';

type SearchableMemoryRow = Pick<
  typeof memories.$inferSelect,
  'id' | 'ownerId' | 'agentId' | 'content' | 'category' | 'tags' | 'poolId' | 'archivedAt'
>;

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

export async function storeMemory(agentId: string, ownerId: string, data: MemoryCreate) {
  if (data.poolId) {
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

  const agentCondition = readablePoolIds.length > 0
    ? or(eq(memories.agentId, agentId), inArray(memories.poolId, readablePoolIds))!
    : eq(memories.agentId, agentId);

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

  const agentCondition = readablePoolIds.length > 0
    ? or(eq(memories.agentId, agentId), inArray(memories.poolId, readablePoolIds))!
    : eq(memories.agentId, agentId);

  // Vector search
  let vectorResults: { id: string; content: string; category: string; importance: number | null; tags: string[] | null; metadata: unknown; sessionId: string | null; poolId: string | null; archivedAt: Date | null; createdAt: Date; updatedAt: Date; score: number }[] = [];

  if (embedding.length > 0) {
    const vectorStr = `[${embedding.join(',')}]`;
    vectorResults = await db
      .select({
        id: memories.id,
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

  // Meilisearch text search — build filter to include pool data
  let meiliFilter = `ownerId = "${ownerId}" AND agentId = "${agentId}"`;
  if (readablePoolIds.length > 0) {
    const poolFilter = readablePoolIds.map((id) => `poolId = "${id}"`).join(' OR ');
    meiliFilter = `ownerId = "${ownerId}" AND (agentId = "${agentId}" OR ${poolFilter})`;
  }

  const textResults = await searchIndex.searchDocuments(
    'memories',
    query,
    meiliFilter,
    limit,
  );

  // Merge: use vector results as primary, boost with text hits
  const textHitIds = new Set((textResults.hits as Array<{ id: string }>).map((h) => h.id));
  const merged = vectorResults
    .map((r) => ({
      data: {
        id: r.id,
        content: r.content,
        category: r.category,
        importance: r.importance,
        tags: r.tags,
        metadata: r.metadata,
        sessionId: r.sessionId,
        poolId: r.poolId,
        poolName: null as string | null,
        archivedAt: r.archivedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
      score: textHitIds.has(r.id) ? Math.min(r.score + 0.05, 1) : r.score,
    }))
    .filter((r) => r.score >= minScore);

  // Annotate pool names
  const poolIds = [...new Set(merged.filter((r) => r.data.poolId).map((r) => r.data.poolId!))];
  if (poolIds.length > 0) {
    const names = await resolvePoolNames(poolIds);
    for (const r of merged) {
      if (r.data.poolId) r.data.poolName = names.get(r.data.poolId) ?? null;
    }
  }

  return merged;
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

  // Check access: own data or pool data the agent can read
  if (row.agentId !== agentId) {
    if (!row.poolId) return null;
    const readable = await getReadablePoolIds(agentId, ownerId, 'memory');
    if (!readable.includes(row.poolId)) return null;
  }

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function updateMemory(id: string, agentId: string, ownerId: string, data: MemoryUpdate) {
  // Check if this is pool data that requires write access
  const existing = await getMemory(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
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

export async function archiveMemory(id: string, agentId: string, ownerId: string) {
  // Check if this is pool data that requires write access
  const existing = await getMemory(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
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

export async function startSession(agentId: string, ownerId: string, context?: Record<string, unknown>, poolId?: string) {
  if (poolId) {
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

  return row;
}

export async function updateSession(id: string, agentId: string, ownerId: string, data: SessionUpdate) {
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
        eq(memorySessions.id, id),
        eq(memorySessions.ownerId, ownerId),
        eq(memorySessions.agentId, agentId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function getCurrentSession(agentId: string, ownerId: string) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'memory');

  const agentCondition = readablePoolIds.length > 0
    ? or(eq(memorySessions.agentId, agentId), inArray(memorySessions.poolId, readablePoolIds))!
    : eq(memorySessions.agentId, agentId);

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
    ? or(eq(memorySessions.agentId, agentId), inArray(memorySessions.poolId, readablePoolIds))!
    : eq(memorySessions.agentId, agentId);

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
