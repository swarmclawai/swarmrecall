import { eq, and, or, isNull, sql, desc, lt, ne } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  dreamCycles, dreamConfigs, memories, memorySessions,
  entities, relations,
} from '../db/schema.js';
import { logAuditEvent } from './audit.js';
import { searchIndex } from './search.js';
import { getReadablePoolIds } from './poolAccess.js';
import {
  DREAM_SIMILARITY_THRESHOLD, DREAM_DECAY_AGE_DAYS, DREAM_DECAY_FACTOR,
  DREAM_PRUNE_THRESHOLD, DREAM_SESSION_DECAY, DREAM_DEFAULT_INTERVAL_HOURS,
  DREAM_BATCH_SIZE, DREAM_ENTITY_SIMILARITY, DREAM_OPERATIONS,
} from '@swarmrecall/shared';
import type {
  DreamThresholds, DreamTriggerInput, DreamCycleUpdate, DreamConfigUpdate,
  DreamList,
} from '@swarmrecall/shared';
import { HTTPException } from 'hono/http-exception';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DreamContext {
  agentId: string | null;
  poolId: string | null;
  ownerId: string;
  thresholds: DreamThresholds;
  cycleId: string;
}

const DEFAULT_THRESHOLDS: DreamThresholds = {
  similarityThreshold: DREAM_SIMILARITY_THRESHOLD,
  decayAgeDays: DREAM_DECAY_AGE_DAYS,
  decayFactor: DREAM_DECAY_FACTOR,
  pruneThreshold: DREAM_PRUNE_THRESHOLD,
  sessionDecay: DREAM_SESSION_DECAY,
  entitySimilarity: DREAM_ENTITY_SIMILARITY,
  batchSize: DREAM_BATCH_SIZE,
};

const DEFAULT_OPERATIONS = [
  'deduplicate',
  'summarize_sessions',
  'decay_prune',
  'consolidate_entities',
  'promote_learnings',
] as const;

// ---------------------------------------------------------------------------
// Union-Find (for clustering duplicate pairs into groups)
// ---------------------------------------------------------------------------

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Path compression
    let curr = x;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  groups(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      if (!result.has(root)) result.set(root, []);
      result.get(root)!.push(key);
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Text helpers (for contradiction detection)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'that',
  'this', 'it', 'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s\W]+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return 1 - intersection / union;
}

// ---------------------------------------------------------------------------
// Cycle Management
// ---------------------------------------------------------------------------

export async function startDreamCycle(params: {
  agentId: string | null;
  poolId?: string | null;
  ownerId: string;
  input?: DreamTriggerInput;
  trigger?: string;
}) {
  const { agentId, ownerId, input, trigger = 'manual' } = params;
  const poolId = params.poolId ?? null;

  // Check for already-running cycle
  const conditions = [
    eq(dreamCycles.ownerId, ownerId),
    eq(dreamCycles.status, 'running'),
  ];
  if (agentId) conditions.push(eq(dreamCycles.agentId, agentId));

  const [running] = await db
    .select({ id: dreamCycles.id })
    .from(dreamCycles)
    .where(and(...conditions))
    .limit(1);

  if (running) {
    throw new HTTPException(409, {
      message: 'A dream cycle is already running for this agent',
    });
  }

  // Resolve operations from input or defaults
  const ops = input?.operations ?? [...DEFAULT_OPERATIONS];

  const [cycle] = await db
    .insert(dreamCycles)
    .values({
      agentId,
      poolId,
      ownerId,
      status: 'running',
      operations: ops,
      trigger,
      startedAt: new Date(),
    })
    .returning();

  logAuditEvent({
    eventType: 'dream.cycle.started',
    actorId: agentId ?? undefined,
    targetId: cycle.id,
    targetType: 'dream_cycle',
    ownerId,
    payload: { operations: ops, trigger },
  }).catch((err) => console.error('Failed to log dream audit:', err));

  return cycle;
}

export async function updateDreamCycle(
  cycleId: string,
  ownerId: string,
  update: DreamCycleUpdate,
) {
  const sets: Record<string, unknown> = {};
  if (update.status) sets.status = update.status;
  if (update.results) sets.results = update.results;
  if (update.error) sets.error = update.error;
  if (update.status === 'completed' || update.status === 'failed') {
    sets.completedAt = new Date();
  }

  if (Object.keys(sets).length === 0) return null;

  const [row] = await db
    .update(dreamCycles)
    .set(sets)
    .where(and(eq(dreamCycles.id, cycleId), eq(dreamCycles.ownerId, ownerId)))
    .returning();

  if (!row) return null;

  // Update lastDreamAt on config when completed
  if (update.status === 'completed' && row.agentId) {
    db.update(dreamConfigs)
      .set({ lastDreamAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(dreamConfigs.agentId, row.agentId),
          eq(dreamConfigs.ownerId, ownerId),
        ),
      )
      .then(() => {})
      .catch((err) => console.error('Failed to update lastDreamAt:', err));
  }

  return row;
}

export async function getDreamCycle(cycleId: string, ownerId: string) {
  const [row] = await db
    .select()
    .from(dreamCycles)
    .where(and(eq(dreamCycles.id, cycleId), eq(dreamCycles.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

export async function listDreamCycles(
  ownerId: string,
  filters: DreamList,
  agentId?: string,
) {
  const conditions = [eq(dreamCycles.ownerId, ownerId)];
  if (filters.status) conditions.push(eq(dreamCycles.status, filters.status));
  if (filters.agentId) conditions.push(eq(dreamCycles.agentId, filters.agentId));
  if (agentId) conditions.push(eq(dreamCycles.agentId, agentId));

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(dreamCycles)
      .where(where)
      .orderBy(desc(dreamCycles.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(dreamCycles)
      .where(where),
  ]);

  return {
    data,
    total: countResult[0].count,
    limit: filters.limit,
    offset: filters.offset,
  };
}

// ---------------------------------------------------------------------------
// Config Management
// ---------------------------------------------------------------------------

export async function getDreamConfig(agentId: string, ownerId: string) {
  const [row] = await db
    .select()
    .from(dreamConfigs)
    .where(
      and(eq(dreamConfigs.agentId, agentId), eq(dreamConfigs.ownerId, ownerId)),
    )
    .limit(1);

  if (row) {
    return {
      ...row,
      enabled: row.enabled === 'true',
      operations: (row.operations ?? DEFAULT_OPERATIONS) as string[],
      thresholds: (row.thresholds ?? {}) as Partial<DreamThresholds>,
    };
  }

  // Return computed defaults
  return {
    id: null,
    agentId,
    poolId: null,
    ownerId,
    enabled: false,
    intervalHours: DREAM_DEFAULT_INTERVAL_HOURS,
    operations: [...DEFAULT_OPERATIONS] as string[],
    thresholds: {} as Partial<DreamThresholds>,
    lastDreamAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function upsertDreamConfig(
  agentId: string,
  ownerId: string,
  update: DreamConfigUpdate,
) {
  const [existing] = await db
    .select()
    .from(dreamConfigs)
    .where(
      and(eq(dreamConfigs.agentId, agentId), eq(dreamConfigs.ownerId, ownerId)),
    )
    .limit(1);

  if (existing) {
    const sets: Record<string, unknown> = { updatedAt: new Date() };
    if (update.enabled !== undefined) sets.enabled = String(update.enabled);
    if (update.intervalHours !== undefined) sets.intervalHours = update.intervalHours;
    if (update.operations) sets.operations = update.operations;
    if (update.thresholds) {
      sets.thresholds = { ...(existing.thresholds as object), ...update.thresholds };
    }

    const [row] = await db
      .update(dreamConfigs)
      .set(sets)
      .where(eq(dreamConfigs.id, existing.id))
      .returning();
    return {
      ...row,
      enabled: row.enabled === 'true',
      operations: row.operations as string[],
      thresholds: row.thresholds as Partial<DreamThresholds>,
    };
  }

  const [row] = await db
    .insert(dreamConfigs)
    .values({
      agentId,
      ownerId,
      enabled: update.enabled !== undefined ? String(update.enabled) : 'false',
      intervalHours: update.intervalHours ?? DREAM_DEFAULT_INTERVAL_HOURS,
      operations: update.operations ?? [...DEFAULT_OPERATIONS],
      thresholds: update.thresholds ?? {},
    })
    .returning();

  return {
    ...row,
    enabled: row.enabled === 'true',
    operations: row.operations as string[],
    thresholds: row.thresholds as Partial<DreamThresholds>,
  };
}

// ---------------------------------------------------------------------------
// Helper: Build DreamContext from request params
// ---------------------------------------------------------------------------

function buildThresholds(overrides?: Partial<DreamThresholds>): DreamThresholds {
  return { ...DEFAULT_THRESHOLDS, ...overrides };
}

// ---------------------------------------------------------------------------
// Candidate Discovery: Duplicate Memory Clusters
// ---------------------------------------------------------------------------

export async function findDuplicateClusters(
  agentId: string,
  ownerId: string,
  thresholdOverrides?: Partial<DreamThresholds>,
  limit = 50,
) {
  const thresholds = buildThresholds(thresholdOverrides);

  // Get pairs of similar memories using pgvector cosine distance
  const pairs = await db.execute<{
    id_a: string;
    id_b: string;
    content_a: string;
    content_b: string;
    importance_a: number;
    importance_b: number;
    similarity: number;
  }>(sql`
    WITH recent_memories AS (
      SELECT id, content, importance, embedding
      FROM memories
      WHERE agent_id = ${agentId}
        AND owner_id = ${ownerId}
        AND archived_at IS NULL
        AND embedding IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${thresholds.batchSize}
    )
    SELECT
      a.id AS id_a, b.id AS id_b,
      a.content AS content_a, b.content AS content_b,
      a.importance AS importance_a, b.importance AS importance_b,
      1 - (a.embedding <=> b.embedding) AS similarity
    FROM recent_memories a, recent_memories b
    WHERE a.id < b.id
      AND 1 - (a.embedding <=> b.embedding) >= ${thresholds.similarityThreshold}
    ORDER BY similarity DESC
    LIMIT ${thresholds.batchSize}
  `);

  if (pairs.rows.length === 0) {
    return { clusters: [], totalClusters: 0, thresholdUsed: thresholds.similarityThreshold };
  }

  // Build clusters using union-find
  const uf = new UnionFind();
  const memoryData = new Map<string, { content: string; importance: number }>();
  const pairSimilarities = new Map<string, number>();

  for (const row of pairs.rows) {
    uf.union(row.id_a, row.id_b);
    memoryData.set(row.id_a, { content: row.content_a, importance: row.importance_a });
    memoryData.set(row.id_b, { content: row.content_b, importance: row.importance_b });
    pairSimilarities.set(`${row.id_a}:${row.id_b}`, row.similarity);
    pairSimilarities.set(`${row.id_b}:${row.id_a}`, row.similarity);
  }

  const groups = uf.groups();
  const clusters = [];

  for (const [, memberIds] of groups) {
    if (memberIds.length < 2) continue;

    // Pick anchor: highest importance
    let anchorId = memberIds[0];
    let maxImportance = memoryData.get(anchorId)!.importance;
    for (const id of memberIds) {
      const imp = memoryData.get(id)!.importance;
      if (imp > maxImportance) {
        maxImportance = imp;
        anchorId = id;
      }
    }

    const anchorData = memoryData.get(anchorId)!;
    const members = memberIds
      .filter((id) => id !== anchorId)
      .map((id) => ({
        id,
        content: memoryData.get(id)!.content,
        importance: memoryData.get(id)!.importance,
        similarity: pairSimilarities.get(`${id}:${anchorId}`) ?? 0,
      }));

    clusters.push({
      anchor: { id: anchorId, content: anchorData.content, importance: anchorData.importance },
      members,
    });
  }

  // Sort by cluster size descending, limit
  clusters.sort((a, b) => b.members.length - a.members.length);
  const limited = clusters.slice(0, limit);

  return {
    clusters: limited,
    totalClusters: clusters.length,
    thresholdUsed: thresholds.similarityThreshold,
  };
}

// ---------------------------------------------------------------------------
// Candidate Discovery: Unsummarized Sessions
// ---------------------------------------------------------------------------

export async function findUnsummarizedSessions(
  agentId: string,
  ownerId: string,
  limit = 50,
) {
  const rows = await db.execute<{
    id: string;
    memory_count: number;
    started_at: string;
    ended_at: string;
  }>(sql`
    SELECT
      ms.id,
      COUNT(m.id)::int AS memory_count,
      ms.started_at,
      ms.ended_at
    FROM memory_sessions ms
    LEFT JOIN memories m
      ON m.session_id = ms.id AND m.archived_at IS NULL
    WHERE ms.agent_id = ${agentId}
      AND ms.owner_id = ${ownerId}
      AND ms.ended_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM memories
        WHERE session_id = ms.id
          AND category = 'session_summary'
          AND archived_at IS NULL
      )
    GROUP BY ms.id
    ORDER BY ms.ended_at DESC
    LIMIT ${limit}
  `);

  return {
    sessions: rows.rows.map((r) => ({
      id: r.id,
      memoryCount: r.memory_count,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    })),
    totalSessions: rows.rows.length,
  };
}

// ---------------------------------------------------------------------------
// Candidate Discovery: Duplicate Entities
// ---------------------------------------------------------------------------

export async function findDuplicateEntities(
  agentId: string,
  ownerId: string,
  thresholdOverrides?: Partial<DreamThresholds>,
  limit = 50,
) {
  const thresholds = buildThresholds(thresholdOverrides);

  const pairs = await db.execute<{
    id_a: string;
    id_b: string;
    name_a: string;
    name_b: string;
    type_a: string;
    type_b: string;
    properties_a: string;
    properties_b: string;
    similarity: number;
  }>(sql`
    SELECT
      a.id AS id_a, b.id AS id_b,
      a.name AS name_a, b.name AS name_b,
      a.type AS type_a, b.type AS type_b,
      a.properties::text AS properties_a, b.properties::text AS properties_b,
      1 - (a.embedding <=> b.embedding) AS similarity
    FROM entities a, entities b
    WHERE a.id < b.id
      AND a.agent_id = ${agentId}
      AND b.agent_id = ${agentId}
      AND a.owner_id = ${ownerId}
      AND b.owner_id = ${ownerId}
      AND a.archived_at IS NULL
      AND b.archived_at IS NULL
      AND a.embedding IS NOT NULL
      AND b.embedding IS NOT NULL
      AND a.type = b.type
      AND 1 - (a.embedding <=> b.embedding) >= ${thresholds.entitySimilarity}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);

  return {
    pairs: pairs.rows.map((r) => ({
      entity_a: {
        id: r.id_a,
        type: r.type_a,
        name: r.name_a,
        properties: JSON.parse(r.properties_a || '{}'),
      },
      entity_b: {
        id: r.id_b,
        type: r.type_b,
        name: r.name_b,
        properties: JSON.parse(r.properties_b || '{}'),
      },
      similarity: r.similarity,
    })),
    totalPairs: pairs.rows.length,
    thresholdUsed: thresholds.entitySimilarity,
  };
}

// ---------------------------------------------------------------------------
// Candidate Discovery: Stale Memories
// ---------------------------------------------------------------------------

export async function findStaleMemories(
  agentId: string,
  ownerId: string,
  thresholdOverrides?: Partial<DreamThresholds>,
  limit = 100,
) {
  const thresholds = buildThresholds(thresholdOverrides);

  const rows = await db.execute<{
    id: string;
    content: string;
    importance: number;
    created_at: string;
    age_days: number;
  }>(sql`
    SELECT
      id, content, importance, created_at,
      EXTRACT(DAY FROM NOW() - created_at)::int AS age_days
    FROM memories
    WHERE agent_id = ${agentId}
      AND owner_id = ${ownerId}
      AND archived_at IS NULL
      AND created_at < NOW() - MAKE_INTERVAL(days => ${thresholds.decayAgeDays})
      AND category != 'session_summary'
      AND NOT ('pinned' = ANY(tags))
    ORDER BY importance ASC
    LIMIT ${limit}
  `);

  return {
    memories: rows.rows.map((r) => ({
      id: r.id,
      content: r.content,
      importance: r.importance,
      createdAt: r.created_at,
      ageDays: r.age_days,
    })),
    totalStale: rows.rows.length,
    decayAgeDaysUsed: thresholds.decayAgeDays,
  };
}

// ---------------------------------------------------------------------------
// Candidate Discovery: Contradictions
// ---------------------------------------------------------------------------

export async function findContradictions(
  agentId: string,
  ownerId: string,
  thresholdOverrides?: Partial<DreamThresholds>,
  limit = 50,
) {
  const thresholds = buildThresholds(thresholdOverrides);

  // Find memory pairs with high embedding similarity but possibly different content
  const pairs = await db.execute<{
    id_a: string;
    id_b: string;
    content_a: string;
    content_b: string;
    category_a: string;
    category_b: string;
    session_a: string | null;
    session_b: string | null;
    created_a: string;
    created_b: string;
    similarity: number;
  }>(sql`
    WITH recent AS (
      SELECT id, content, category, session_id, created_at, embedding
      FROM memories
      WHERE agent_id = ${agentId}
        AND owner_id = ${ownerId}
        AND archived_at IS NULL
        AND embedding IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${thresholds.batchSize}
    )
    SELECT
      a.id AS id_a, b.id AS id_b,
      a.content AS content_a, b.content AS content_b,
      a.category AS category_a, b.category AS category_b,
      a.session_id AS session_a, b.session_id AS session_b,
      a.created_at AS created_a, b.created_at AS created_b,
      1 - (a.embedding <=> b.embedding) AS similarity
    FROM recent a, recent b
    WHERE a.id < b.id
      AND a.category = b.category
      AND 1 - (a.embedding <=> b.embedding) >= 0.85
      AND (a.session_id IS NULL OR b.session_id IS NULL OR a.session_id != b.session_id)
    ORDER BY similarity DESC
    LIMIT ${thresholds.batchSize}
  `);

  // Compute content divergence (Jaccard distance) in JS
  const results = [];
  for (const row of pairs.rows) {
    const tokensA = tokenize(row.content_a);
    const tokensB = tokenize(row.content_b);
    const divergence = jaccardDistance(tokensA, tokensB);

    // High similarity + high divergence = potential contradiction
    if (divergence >= 0.4) {
      results.push({
        memory_a: { id: row.id_a, content: row.content_a, createdAt: row.created_a },
        memory_b: { id: row.id_b, content: row.content_b, createdAt: row.created_b },
        similarity: row.similarity,
        contentDivergence: Math.round(divergence * 100) / 100,
      });
    }
  }

  // Sort by divergence descending
  results.sort((a, b) => b.contentDivergence - a.contentDivergence);

  return {
    pairs: results.slice(0, limit),
    totalPairs: results.length,
  };
}

// ---------------------------------------------------------------------------
// Candidate Discovery: Unprocessed Memories
// ---------------------------------------------------------------------------

export async function findUnprocessedMemories(
  agentId: string,
  ownerId: string,
  limit = 100,
) {
  const rows = await db.execute<{
    id: string;
    content: string;
    created_at: string;
  }>(sql`
    SELECT id, content, created_at
    FROM memories
    WHERE agent_id = ${agentId}
      AND owner_id = ${ownerId}
      AND archived_at IS NULL
      AND (metadata IS NULL OR metadata->>'dreamProcessedAt' IS NULL)
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return {
    memories: rows.rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
    })),
    totalUnprocessed: rows.rows.length,
  };
}

// ---------------------------------------------------------------------------
// Tier 1 Execution: Decay & Prune
// ---------------------------------------------------------------------------

export async function decayAndPrune(
  agentId: string,
  ownerId: string,
  thresholdOverrides?: Partial<DreamThresholds>,
) {
  const thresholds = buildThresholds(thresholdOverrides);

  // Decay importance for old memories
  const decayed = await db.execute<{ count: number }>(sql`
    UPDATE memories
    SET importance = importance * ${thresholds.decayFactor},
        updated_at = NOW()
    WHERE agent_id = ${agentId}
      AND owner_id = ${ownerId}
      AND archived_at IS NULL
      AND created_at < NOW() - MAKE_INTERVAL(days => ${thresholds.decayAgeDays})
      AND category != 'session_summary'
      AND NOT ('pinned' = ANY(tags))
    RETURNING id
  `);

  const memoriesDecayed = decayed.rows.length;

  // Archive memories below prune threshold
  const pruned = await db.execute<{ id: string }>(sql`
    UPDATE memories
    SET archived_at = NOW(),
        updated_at = NOW()
    WHERE agent_id = ${agentId}
      AND owner_id = ${ownerId}
      AND archived_at IS NULL
      AND importance < ${thresholds.pruneThreshold}
      AND category != 'session_summary'
      AND NOT ('pinned' = ANY(tags))
    RETURNING id
  `);

  const memoriesPruned = pruned.rows.length;

  // Fire-and-forget: remove pruned memories from search index
  for (const row of pruned.rows) {
    searchIndex.removeDocument('memories', row.id)
      .catch((err) => console.error('Failed to remove pruned memory from search:', err));
  }

  return { memoriesDecayed, memoriesPruned };
}

// ---------------------------------------------------------------------------
// Tier 1 Execution: Orphan Cleanup
// ---------------------------------------------------------------------------

export async function cleanupOrphans(agentId: string, ownerId: string) {
  const result = await db.execute<{ count: number }>(sql`
    DELETE FROM relations
    WHERE owner_id = ${ownerId}
      AND agent_id = ${agentId}
      AND (
        from_entity_id IN (SELECT id FROM entities WHERE archived_at IS NOT NULL)
        OR to_entity_id IN (SELECT id FROM entities WHERE archived_at IS NOT NULL)
      )
    RETURNING id
  `);

  return { orphansRemoved: result.rows.length };
}

// ---------------------------------------------------------------------------
// Tier 1 Execution: Combined
// ---------------------------------------------------------------------------

export async function executeTier1(
  agentId: string,
  ownerId: string,
  thresholdOverrides?: Partial<DreamThresholds>,
) {
  const startTime = Date.now();

  const [decayResult, orphanResult] = await Promise.all([
    decayAndPrune(agentId, ownerId, thresholdOverrides),
    cleanupOrphans(agentId, ownerId),
  ]);

  const durationMs = Date.now() - startTime;

  return {
    decay_prune: decayResult,
    consolidate_entities: { entitiesMerged: 0, relationsRemapped: 0, orphansRemoved: orphanResult.orphansRemoved },
    durationMs,
  };
}
