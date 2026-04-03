import { eq, and, or, isNull, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { entities, relations, entityTypes } from '../db/schema.js';
import { generateEmbedding, generateQueryEmbedding } from '../lib/embeddings.js';
import { searchIndex, recordSearchMetric } from './search.js';
import { logAuditEvent } from './audit.js';
import {
  getReadablePoolIds,
  validatePoolWrite,
  annotatePoolNames,
  resolvePoolNames,
  validatePoolsWriteScope,
} from './poolAccess.js';
import type { EntityCreate, EntityUpdate, EntityList, RelationCreate } from '@swarmrecall/shared';

type SearchableEntityRow = Pick<
  typeof entities.$inferSelect,
  'id' | 'ownerId' | 'agentId' | 'name' | 'type' | 'poolId' | 'archivedAt'
>;

type EntitySearchHit = { id: string; _rankingScore?: number; rankingScore?: number };
type PublicEntityRow = Pick<
  typeof entities.$inferSelect,
  | 'id'
  | 'agentId'
  | 'ownerId'
  | 'type'
  | 'name'
  | 'properties'
  | 'poolId'
  | 'archivedAt'
  | 'createdAt'
  | 'updatedAt'
>;

const PUBLIC_ENTITY_SELECT = {
  id: entities.id,
  agentId: entities.agentId,
  ownerId: entities.ownerId,
  type: entities.type,
  name: entities.name,
  properties: entities.properties,
  poolId: entities.poolId,
  archivedAt: entities.archivedAt,
  createdAt: entities.createdAt,
  updatedAt: entities.updatedAt,
} as const;

function buildEntityAccessCondition(agentId: string, readablePoolIds: string[]) {
  return readablePoolIds.length > 0
    ? or(
        and(eq(entities.agentId, agentId), isNull(entities.poolId)),
        inArray(entities.poolId, readablePoolIds),
      )!
    : and(eq(entities.agentId, agentId), isNull(entities.poolId))!;
}

function buildRelationAccessCondition(agentId: string, readablePoolIds: string[]) {
  return readablePoolIds.length > 0
    ? or(
        and(eq(relations.agentId, agentId), isNull(relations.poolId)),
        inArray(relations.poolId, readablePoolIds),
      )!
    : and(eq(relations.agentId, agentId), isNull(relations.poolId))!;
}

function buildEntitySearchFilter(ownerId: string, agentId: string, readablePoolIds: string[]) {
  const privateFilter = `(agentId = "${agentId}" AND poolId IS NULL)`;
  if (readablePoolIds.length === 0) {
    return `ownerId = "${ownerId}" AND ${privateFilter}`;
  }

  const poolFilter = readablePoolIds.map((id) => `poolId = "${id}"`).join(' OR ');
  return `ownerId = "${ownerId}" AND (${privateFilter} OR ${poolFilter})`;
}

function getTextScore(hit: EntitySearchHit) {
  return hit._rankingScore ?? hit.rankingScore ?? 0.5;
}

function toSearchableEntity(row: PublicEntityRow) {
  return {
    id: row.id,
    agentId: row.agentId,
    ownerId: row.ownerId,
    type: row.type,
    name: row.name,
    properties: row.properties,
    poolId: row.poolId,
    poolName: null as string | null,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function syncEntitySearchDocument(row: SearchableEntityRow) {
  if (row.archivedAt) {
    await searchIndex.removeDocument('entities', row.id);
    return;
  }

  await searchIndex.indexDocument('entities', {
    id: row.id,
    ownerId: row.ownerId,
    agentId: row.agentId,
    poolId: row.poolId,
    name: row.name,
    type: row.type,
  });
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export async function createEntity(agentId: string, ownerId: string, data: EntityCreate, scopes?: string[]) {
  if (data.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, data.poolId, 'knowledge');
  }

  const embeddingText = `${data.name} ${data.type} ${JSON.stringify(data.properties)}`;
  const embedding = await generateEmbedding(embeddingText);

  const [row] = await db
    .insert(entities)
    .values({
      agentId,
      ownerId,
      type: data.type,
      name: data.name,
      properties: data.properties,
      embedding: embedding.length > 0 ? embedding : null,
      poolId: data.poolId ?? null,
    })
    .returning();

  // Index in Meilisearch
  syncEntitySearchDocument(row);

  logAuditEvent({
    eventType: 'entity.created',
    actorId: agentId,
    targetId: row.id,
    targetType: 'entity',
    ownerId,
    payload: { type: row.type, name: row.name, poolId: data.poolId },
  });

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function listEntities(
  agentId: string,
  ownerId: string,
  filters: EntityList,
) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'knowledge');
  const agentCondition = buildEntityAccessCondition(agentId, readablePoolIds);

  const conditions = [
    eq(entities.ownerId, ownerId),
    agentCondition,
  ];

  if (!filters.includeArchived) {
    conditions.push(isNull(entities.archivedAt));
  }
  if (filters.type) {
    conditions.push(eq(entities.type, filters.type));
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(entities)
      .where(and(...conditions))
      .orderBy(desc(entities.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entities)
      .where(and(...conditions)),
  ]);

  const annotated = await annotatePoolNames(data);
  return { data: annotated, total: countResult[0].count, limit: filters.limit, offset: filters.offset };
}

export async function getEntity(id: string, agentId: string, ownerId: string) {
  const [entity] = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!entity) return null;

  // Check access: private data belongs to the agent; pool data requires membership.
  if (entity.poolId) {
    const readable = await getReadablePoolIds(agentId, ownerId, 'knowledge');
    if (!readable.includes(entity.poolId)) return null;
  } else if (entity.agentId !== agentId) {
    return null;
  }

  // Fetch relations where this entity is either "from" or "to"
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'knowledge');
  const relationAgentCondition = buildRelationAccessCondition(agentId, readablePoolIds);

  const entityRelations = await db
    .select()
    .from(relations)
    .where(
      and(
        eq(relations.ownerId, ownerId),
        relationAgentCondition,
        or(
          eq(relations.fromEntityId, id),
          eq(relations.toEntityId, id),
        ),
      ),
    );

  const relationPoolIds = [...new Set(entityRelations.filter((r) => r.poolId).map((r) => r.poolId!))];
  const relationPoolNames = await resolvePoolNames(relationPoolIds);
  const [annotated] = await annotatePoolNames([{
    ...entity,
    relations: entityRelations.map((relation) => ({
      ...relation,
      poolName: relation.poolId ? (relationPoolNames.get(relation.poolId) ?? null) : null,
    })),
  }]);
  return annotated;
}

export async function updateEntity(
  id: string,
  agentId: string,
  ownerId: string,
  data: EntityUpdate,
  scopes?: string[],
) {
  // Load entity first to check access
  const [existing] = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!existing) return null;

  if (existing.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'knowledge');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.properties !== undefined) updates.properties = data.properties;
  if (data.archived === true) updates.archivedAt = new Date();
  if (data.archived === false) updates.archivedAt = null;

  // Re-generate embedding if name or properties changed
  if (data.name !== undefined || data.properties !== undefined) {
    const newName = data.name ?? existing.name;
    const newProps = data.properties ?? existing.properties;
    const embeddingText = `${newName} ${existing.type} ${JSON.stringify(newProps)}`;
    const embedding = await generateEmbedding(embeddingText);
    if (embedding.length > 0) {
      updates.embedding = embedding;
    }
  }

  const [row] = await db
    .update(entities)
    .set(updates)
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
      ),
    )
    .returning();

  if (row) {
    await syncEntitySearchDocument(row);
    const [annotated] = await annotatePoolNames([row]);
    return annotated;
  }

  return null;
}

export async function archiveEntity(id: string, agentId: string, ownerId: string, scopes?: string[]) {
  // Load entity first to check access
  const [existing] = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!existing) return null;

  if (existing.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'knowledge');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const [row] = await db
    .update(entities)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
      ),
    )
    .returning();

  if (row) {
    await syncEntitySearchDocument(row);
    logAuditEvent({
      eventType: 'entity.archived',
      actorId: agentId,
      targetId: id,
      targetType: 'entity',
      ownerId,
    });
  }

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export async function createRelation(
  agentId: string,
  ownerId: string,
  data: RelationCreate,
  scopes?: string[],
) {
  if (data.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, data.poolId, 'knowledge');
  }

  // Verify both entities exist and belong to the same owner+agent or readable pools
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'knowledge');

  const entityAgentCondition = buildEntityAccessCondition(agentId, readablePoolIds);

  const found = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.ownerId, ownerId),
        entityAgentCondition,
        or(
          eq(entities.id, data.fromEntityId),
          eq(entities.id, data.toEntityId),
        ),
      ),
    );

  const foundIds = new Set(found.map((e) => e.id));
  if (!foundIds.has(data.fromEntityId) || !foundIds.has(data.toEntityId)) {
    return null; // One or both entities not found / not accessible
  }

  const [row] = await db
    .insert(relations)
    .values({
      agentId,
      ownerId,
      fromEntityId: data.fromEntityId,
      toEntityId: data.toEntityId,
      relation: data.relation,
      properties: data.properties ?? null,
      poolId: data.poolId ?? null,
    })
    .returning();

  logAuditEvent({
    eventType: 'relation.created',
    actorId: agentId,
    targetId: row.id,
    targetType: 'relation',
    ownerId,
    payload: { relation: row.relation, from: row.fromEntityId, to: row.toEntityId, poolId: data.poolId },
  });

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

export async function listRelations(
  agentId: string,
  ownerId: string,
  filters: { entityId?: string; relation?: string; limit: number; offset: number },
) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'knowledge');
  const agentCondition = buildRelationAccessCondition(agentId, readablePoolIds);

  const conditions = [
    eq(relations.ownerId, ownerId),
    agentCondition,
  ];

  if (filters.entityId) {
    conditions.push(
      or(
        eq(relations.fromEntityId, filters.entityId),
        eq(relations.toEntityId, filters.entityId),
      )!,
    );
  }
  if (filters.relation) {
    conditions.push(eq(relations.relation, filters.relation));
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(relations)
      .where(and(...conditions))
      .orderBy(desc(relations.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(relations)
      .where(and(...conditions)),
  ]);

  const annotated = await annotatePoolNames(data);
  return { data: annotated, total: countResult[0].count, limit: filters.limit, offset: filters.offset };
}

export async function deleteRelation(id: string, agentId: string, ownerId: string, scopes?: string[]) {
  // Load first to check pool write access
  const [existing] = await db
    .select()
    .from(relations)
    .where(
      and(
        eq(relations.id, id),
        eq(relations.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!existing) return null;

  if (existing.poolId) {
    validatePoolsWriteScope(scopes);
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'knowledge');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const [row] = await db
    .delete(relations)
    .where(
      and(
        eq(relations.id, id),
        eq(relations.ownerId, ownerId),
      ),
    )
    .returning();

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Graph traversal
// ---------------------------------------------------------------------------

export async function traverse(
  agentId: string,
  ownerId: string,
  startId: string,
  relation: string | undefined,
  depth: number,
  limit: number,
) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'knowledge');

  const poolSql = sql.join(readablePoolIds.map((id) => sql`${id}`), sql`, `);
  const entityAccessCondition = readablePoolIds.length > 0
    ? sql`((e.agent_id = ${agentId} AND e.pool_id IS NULL) OR e.pool_id IN (${poolSql}))`
    : sql`(e.agent_id = ${agentId} AND e.pool_id IS NULL)`;

  const entityAccessCondition2 = readablePoolIds.length > 0
    ? sql`((e2.agent_id = ${agentId} AND e2.pool_id IS NULL) OR e2.pool_id IN (${poolSql}))`
    : sql`(e2.agent_id = ${agentId} AND e2.pool_id IS NULL)`;

  const relationAccessCondition = readablePoolIds.length > 0
    ? sql`((r.agent_id = ${agentId} AND r.pool_id IS NULL) OR r.pool_id IN (${poolSql}))`
    : sql`(r.agent_id = ${agentId} AND r.pool_id IS NULL)`;

  const relationFilter = relation
    ? sql`AND r.relation = ${relation}`
    : sql``;

  const result = await db.execute(sql`
    WITH RECURSIVE graph AS (
      -- Base case: the start entity
      SELECT
        e.id,
        e.type,
        e.name,
        e.properties,
        0 AS depth,
        NULL::uuid AS relation_id,
        NULL::text AS relation_type,
        NULL::uuid AS from_entity_id
      FROM entities e
      WHERE e.id = ${startId}
        AND e.owner_id = ${ownerId}
        AND ${entityAccessCondition}
        AND e.archived_at IS NULL

      UNION ALL

      -- Recursive: follow outgoing relations
      SELECT
        e2.id,
        e2.type,
        e2.name,
        e2.properties,
        g.depth + 1,
        r.id AS relation_id,
        r.relation AS relation_type,
        r.from_entity_id
      FROM graph g
      JOIN relations r ON r.from_entity_id = g.id
        AND r.owner_id = ${ownerId}
        AND ${relationAccessCondition}
        ${relationFilter}
      JOIN entities e2 ON e2.id = r.to_entity_id
        AND ${entityAccessCondition2}
        AND e2.archived_at IS NULL
      WHERE g.depth < ${depth}
    )
    SELECT * FROM graph
    LIMIT ${limit}
  `);

  // Separate entities and relations from the flat result
  const entityMap = new Map<string, { id: string; type: string; name: string; properties: unknown; depth: number }>();
  const traversedRelations: { id: string; relation: string; fromEntityId: string; toEntityId: string }[] = [];

  for (const row of result.rows as Array<Record<string, unknown>>) {
    const entityId = row.id as string;
    if (!entityMap.has(entityId)) {
      entityMap.set(entityId, {
        id: entityId,
        type: row.type as string,
        name: row.name as string,
        properties: row.properties,
        depth: row.depth as number,
      });
    }
    if (row.relation_id) {
      traversedRelations.push({
        id: row.relation_id as string,
        relation: row.relation_type as string,
        fromEntityId: row.from_entity_id as string,
        toEntityId: entityId,
      });
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relations: traversedRelations,
  };
}

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------

export async function searchEntities(
  agentId: string,
  ownerId: string,
  query: string,
  limit: number,
  minScore: number,
) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'knowledge');
  const embedding = await generateQueryEmbedding(query);
  const agentCondition = buildEntityAccessCondition(agentId, readablePoolIds);

  let vectorResults: Array<PublicEntityRow & { score: number }> = [];

  if (embedding.length > 0) {
    const vectorStr = `[${embedding.join(',')}]`;
    const vStart = performance.now();
    vectorResults = await db
      .select({
        ...PUBLIC_ENTITY_SELECT,
        score: sql<number>`1 - (${entities.embedding} <=> ${vectorStr})`,
      })
      .from(entities)
      .where(
        and(
          eq(entities.ownerId, ownerId),
          agentCondition,
          isNull(entities.archivedAt),
          sql`${entities.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(sql`${entities.embedding} <=> ${vectorStr}`)
      .limit(limit);
    recordSearchMetric({
      method: 'vector',
      indexName: 'entities',
      resultCount: vectorResults.length,
      durationMs: performance.now() - vStart,
      agentId,
      ownerId,
    });
  }

  const textResults = await searchIndex.searchDocuments(
    'entities',
    query,
    buildEntitySearchFilter(ownerId, agentId, readablePoolIds),
    limit,
  );

  const textScores = new Map(
    (textResults.hits as EntitySearchHit[]).map((hit) => [hit.id, getTextScore(hit)]),
  );
  const merged = vectorResults
    .map((r) => ({
      data: toSearchableEntity(r),
      score: Math.max(r.score, textScores.get(r.id) ?? 0),
    }))
    .filter((r) => r.score >= minScore);

  const mergedIds = new Set(merged.map((r) => r.data.id));
  const textOnlyIds = (textResults.hits as EntitySearchHit[])
    .map((hit) => hit.id)
    .filter((id) => !mergedIds.has(id));

  if (textOnlyIds.length > 0) {
    const textRows = await db
      .select(PUBLIC_ENTITY_SELECT)
      .from(entities)
      .where(
        and(
          eq(entities.ownerId, ownerId),
          agentCondition,
          isNull(entities.archivedAt),
          inArray(entities.id, textOnlyIds),
        ),
      );

    const textRowMap = new Map(textRows.map((row) => [row.id, row]));

    for (const id of textOnlyIds) {
      const row = textRowMap.get(id);
      if (!row) continue;
      const score = textScores.get(id) ?? 0.5;
      if (score >= minScore) {
        merged.push({ data: toSearchableEntity(row), score });
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

// ---------------------------------------------------------------------------
// Entity type constraints validation
// ---------------------------------------------------------------------------

export async function validateConstraints(agentId: string, ownerId: string) {
  // Fetch all entity types for this owner
  const types = await db
    .select()
    .from(entityTypes)
    .where(eq(entityTypes.ownerId, ownerId));

  if (types.length === 0) {
    return { valid: true, errors: [] };
  }

  const typeSchemaMap = new Map<string, Record<string, unknown>>();
  for (const t of types) {
    typeSchemaMap.set(t.name, t.schema as Record<string, unknown>);
  }

  // Fetch all non-archived entities of those types
  const allEntities = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.ownerId, ownerId),
        eq(entities.agentId, agentId),
        isNull(entities.archivedAt),
      ),
    );

  const errors: { entityId: string; entityName: string; entityType: string; message: string }[] = [];

  for (const entity of allEntities) {
    const schema = typeSchemaMap.get(entity.type);
    if (!schema) continue; // No schema defined for this type, skip

    // Check required fields from schema
    const requiredFields = schema.required as string[] | undefined;
    if (requiredFields && Array.isArray(requiredFields)) {
      const props = (entity.properties ?? {}) as Record<string, unknown>;
      for (const field of requiredFields) {
        if (!(field in props) || props[field] === null || props[field] === undefined) {
          errors.push({
            entityId: entity.id,
            entityName: entity.name,
            entityType: entity.type,
            message: `Missing required property: ${field}`,
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Entity types CRUD
// ---------------------------------------------------------------------------

export async function createEntityType(ownerId: string, data: { name: string; schema: Record<string, unknown> }) {
  const [row] = await db
    .insert(entityTypes)
    .values({
      ownerId,
      name: data.name,
      schema: data.schema,
    })
    .returning();

  return row;
}

export async function listEntityTypes(ownerId: string) {
  return db
    .select()
    .from(entityTypes)
    .where(eq(entityTypes.ownerId, ownerId))
    .orderBy(desc(entityTypes.createdAt));
}
