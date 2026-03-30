import { eq, and, desc, sql, gte, isNull, SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { learnings, learningPatterns } from '../db/schema.js';
import { generateEmbedding } from '../lib/embeddings.js';
import { indexDocument, searchDocuments } from './search.js';
import { logAuditEvent } from './audit.js';
import {
  SIMILARITY_THRESHOLD,
  PROMOTION_THRESHOLD,
  PROMOTION_SESSION_MIN,
  PROMOTION_WINDOW_DAYS,
} from '@swarmrecall/shared';
import type { LearningCreate, LearningUpdate, LearningList } from '@swarmrecall/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vectorToSql(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

// ---------------------------------------------------------------------------
// logLearning
// ---------------------------------------------------------------------------

export async function logLearning(agentId: string, ownerId: string, data: LearningCreate) {
  // 1. Generate embedding
  const embedding = await generateEmbedding(data.summary + (data.details ? ' ' + data.details : ''));

  // 2. Insert learning
  const [learning] = await db
    .insert(learnings)
    .values({
      agentId,
      ownerId,
      category: data.category,
      summary: data.summary,
      details: data.details ?? null,
      priority: data.priority,
      area: data.area ?? null,
      suggestedAction: data.suggestedAction ?? null,
      tags: data.tags,
      metadata: data.metadata ?? null,
      embedding: embedding.length > 0 ? embedding : null,
    })
    .returning();

  // 3. Index in Meilisearch
  await indexDocument('learnings', {
    id: learning.id,
    agentId,
    ownerId,
    category: learning.category,
    summary: learning.summary,
    details: learning.details,
    status: learning.status,
    priority: learning.priority,
    area: learning.area,
    suggestedAction: learning.suggestedAction,
    tags: learning.tags,
  });

  // 4. Pattern detection — find similar learnings
  let patternId: string | null = null;
  if (embedding.length > 0) {
    const similar = await findSimilarLearnings(agentId, ownerId, embedding, learning.id);
    if (similar.length > 0) {
      const similarIds = similar.map((s) => s.id);
      patternId = await updateOrCreatePattern(agentId, ownerId, learning.id, similarIds);
    }
  }

  // 5. Audit log
  await logAuditEvent({
    eventType: 'learning.created',
    actorId: agentId,
    targetId: learning.id,
    targetType: 'learning',
    ownerId,
    payload: { category: learning.category, patternId },
  });

  return { ...learning, patternId };
}

// ---------------------------------------------------------------------------
// findSimilarLearnings
// ---------------------------------------------------------------------------

export async function findSimilarLearnings(
  agentId: string,
  ownerId: string,
  embedding: number[],
  excludeId?: string,
) {
  const vectorStr = vectorToSql(embedding);

  const conditions = [
    eq(learnings.agentId, agentId),
    eq(learnings.ownerId, ownerId),
    isNull(learnings.archivedAt),
    sql`${learnings.embedding} IS NOT NULL`,
  ];

  if (excludeId) {
    conditions.push(sql`${learnings.id} != ${excludeId}`);
  }

  const rows = await db
    .select({
      id: learnings.id,
      summary: learnings.summary,
      score: sql<number>`1 - (${learnings.embedding} <=> ${sql.raw(`'${vectorStr}'::vector`)})`,
    })
    .from(learnings)
    .where(and(...conditions))
    .orderBy(sql`1 - (${learnings.embedding} <=> ${sql.raw(`'${vectorStr}'::vector`)}) DESC`)
    .limit(10);

  return rows.filter((r) => r.score >= SIMILARITY_THRESHOLD);
}

// ---------------------------------------------------------------------------
// updateOrCreatePattern
// ---------------------------------------------------------------------------

export async function updateOrCreatePattern(
  agentId: string,
  ownerId: string,
  learningId: string,
  similarIds: string[],
): Promise<string> {
  // Check if any of the similar learnings already belong to a pattern
  const allIds = [learningId, ...similarIds];

  const existingPatterns = await db
    .select()
    .from(learningPatterns)
    .where(
      and(
        eq(learningPatterns.agentId, agentId),
        eq(learningPatterns.ownerId, ownerId),
      ),
    );

  // Find a pattern that contains any of the similar IDs
  const matchedPattern = existingPatterns.find((p) =>
    p.learningIds.some((pid) => similarIds.includes(pid)),
  );

  if (matchedPattern) {
    // Merge learningId into existing pattern
    const mergedIds = Array.from(new Set([...matchedPattern.learningIds, learningId]));
    const [updated] = await db
      .update(learningPatterns)
      .set({
        learningIds: mergedIds,
        recurrenceCount: mergedIds.length,
        sessionCount: matchedPattern.sessionCount + 1,
        lastSeenAt: new Date(),
      })
      .where(
        and(
          eq(learningPatterns.id, matchedPattern.id),
          eq(learningPatterns.agentId, agentId),
          eq(learningPatterns.ownerId, ownerId),
        ),
      )
      .returning();

    return updated.id;
  }

  // Create new pattern
  const [newPattern] = await db
    .insert(learningPatterns)
    .values({
      agentId,
      ownerId,
      patternSummary: `Recurring pattern across ${allIds.length} learnings`,
      recurrenceCount: allIds.length,
      sessionCount: 1,
      learningIds: allIds,
    })
    .returning();

  return newPattern.id;
}

// ---------------------------------------------------------------------------
// listLearnings
// ---------------------------------------------------------------------------

export async function listLearnings(agentId: string, ownerId: string, filters: LearningList) {
  const conditions: SQL[] = [
    eq(learnings.agentId, agentId),
    eq(learnings.ownerId, ownerId),
  ];

  if (!filters.includeArchived) {
    conditions.push(isNull(learnings.archivedAt));
  }
  if (filters.category) {
    conditions.push(eq(learnings.category, filters.category));
  }
  if (filters.status) {
    conditions.push(eq(learnings.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(learnings.priority, filters.priority));
  }
  if (filters.area) {
    conditions.push(eq(learnings.area, filters.area));
  }

  const where = and(...conditions)!;

  const [data, [{ count }]] = await Promise.all([
    db
      .select({
        id: learnings.id,
        agentId: learnings.agentId,
        ownerId: learnings.ownerId,
        category: learnings.category,
        summary: learnings.summary,
        details: learnings.details,
        priority: learnings.priority,
        status: learnings.status,
        area: learnings.area,
        suggestedAction: learnings.suggestedAction,
        resolution: learnings.resolution,
        resolutionCommit: learnings.resolutionCommit,
        tags: learnings.tags,
        metadata: learnings.metadata,
        archivedAt: learnings.archivedAt,
        createdAt: learnings.createdAt,
        updatedAt: learnings.updatedAt,
      })
      .from(learnings)
      .where(where)
      .orderBy(desc(learnings.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(learnings)
      .where(where),
  ]);

  return { data, total: count, limit: filters.limit, offset: filters.offset };
}

// ---------------------------------------------------------------------------
// searchLearnings
// ---------------------------------------------------------------------------

export async function searchLearnings(
  agentId: string,
  ownerId: string,
  query: string,
  limit: number,
  minScore: number,
) {
  // Generate embedding for semantic search
  const embedding = await generateEmbedding(query);

  if (embedding.length === 0) {
    // Fall back to Meilisearch text search
    const results = await searchDocuments(
      'learnings',
      query,
      `ownerId = "${ownerId}" AND agentId = "${agentId}"`,
      limit,
    );
    return { data: results.hits, total: results.estimatedTotalHits };
  }

  const vectorStr = vectorToSql(embedding);

  const rows = await db
    .select({
      id: learnings.id,
      agentId: learnings.agentId,
      ownerId: learnings.ownerId,
      category: learnings.category,
      summary: learnings.summary,
      details: learnings.details,
      priority: learnings.priority,
      status: learnings.status,
      area: learnings.area,
      suggestedAction: learnings.suggestedAction,
      resolution: learnings.resolution,
      tags: learnings.tags,
      metadata: learnings.metadata,
      createdAt: learnings.createdAt,
      updatedAt: learnings.updatedAt,
      score: sql<number>`1 - (${learnings.embedding} <=> ${sql.raw(`'${vectorStr}'::vector`)})`,
    })
    .from(learnings)
    .where(
      and(
        eq(learnings.agentId, agentId),
        eq(learnings.ownerId, ownerId),
        isNull(learnings.archivedAt),
        sql`${learnings.embedding} IS NOT NULL`,
      ),
    )
    .orderBy(sql`1 - (${learnings.embedding} <=> ${sql.raw(`'${vectorStr}'::vector`)}) DESC`)
    .limit(limit);

  const filtered = rows.filter((r) => r.score >= minScore);
  return { data: filtered, total: filtered.length };
}

// ---------------------------------------------------------------------------
// getLearning
// ---------------------------------------------------------------------------

export async function getLearning(id: string, agentId: string, ownerId: string) {
  const [row] = await db
    .select({
      id: learnings.id,
      agentId: learnings.agentId,
      ownerId: learnings.ownerId,
      category: learnings.category,
      summary: learnings.summary,
      details: learnings.details,
      priority: learnings.priority,
      status: learnings.status,
      area: learnings.area,
      suggestedAction: learnings.suggestedAction,
      resolution: learnings.resolution,
      resolutionCommit: learnings.resolutionCommit,
      tags: learnings.tags,
      metadata: learnings.metadata,
      archivedAt: learnings.archivedAt,
      createdAt: learnings.createdAt,
      updatedAt: learnings.updatedAt,
    })
    .from(learnings)
    .where(
      and(
        eq(learnings.id, id),
        eq(learnings.agentId, agentId),
        eq(learnings.ownerId, ownerId),
      ),
    )
    .limit(1);

  return row ?? null;
}

// ---------------------------------------------------------------------------
// updateLearning
// ---------------------------------------------------------------------------

export async function updateLearning(
  id: string,
  agentId: string,
  ownerId: string,
  data: LearningUpdate,
) {
  const [updated] = await db
    .update(learnings)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(learnings.id, id),
        eq(learnings.agentId, agentId),
        eq(learnings.ownerId, ownerId),
      ),
    )
    .returning();

  return updated ?? null;
}

// ---------------------------------------------------------------------------
// getPatterns
// ---------------------------------------------------------------------------

export async function getPatterns(agentId: string, ownerId: string) {
  return db
    .select()
    .from(learningPatterns)
    .where(
      and(
        eq(learningPatterns.agentId, agentId),
        eq(learningPatterns.ownerId, ownerId),
        gte(learningPatterns.recurrenceCount, 2),
      ),
    )
    .orderBy(desc(learningPatterns.recurrenceCount));
}

// ---------------------------------------------------------------------------
// getPromotionCandidates
// ---------------------------------------------------------------------------

export async function getPromotionCandidates(agentId: string, ownerId: string) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - PROMOTION_WINDOW_DAYS);

  return db
    .select()
    .from(learningPatterns)
    .where(
      and(
        eq(learningPatterns.agentId, agentId),
        eq(learningPatterns.ownerId, ownerId),
        gte(learningPatterns.recurrenceCount, PROMOTION_THRESHOLD),
        gte(learningPatterns.sessionCount, PROMOTION_SESSION_MIN),
        gte(learningPatterns.lastSeenAt, windowStart),
        isNull(learningPatterns.promotedAt),
      ),
    )
    .orderBy(desc(learningPatterns.recurrenceCount));
}

// ---------------------------------------------------------------------------
// linkLearnings
// ---------------------------------------------------------------------------

export async function linkLearnings(
  learningId: string,
  targetId: string,
  agentId: string,
  ownerId: string,
) {
  // Verify both learnings exist and belong to the same agent/owner
  const [source, target] = await Promise.all([
    getLearning(learningId, agentId, ownerId),
    getLearning(targetId, agentId, ownerId),
  ]);

  if (!source) return { error: 'Source learning not found' };
  if (!target) return { error: 'Target learning not found' };

  // Find or create a pattern containing both
  const patternId = await updateOrCreatePattern(agentId, ownerId, learningId, [targetId]);

  await logAuditEvent({
    eventType: 'learning.linked',
    actorId: agentId,
    targetId: learningId,
    targetType: 'learning',
    ownerId,
    payload: { targetId, patternId },
  });

  return { patternId };
}
