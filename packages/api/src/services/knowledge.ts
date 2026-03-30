import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { entities, relations, entityTypes } from '../db/schema.js';
import { generateEmbedding } from '../lib/embeddings.js';
import { indexDocument, searchDocuments } from './search.js';
import { logAuditEvent } from './audit.js';
import type { EntityCreate, EntityUpdate, EntityList, RelationCreate } from '@swarmrecall/shared';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export async function createEntity(agentId: string, ownerId: string, data: EntityCreate) {
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
    })
    .returning();

  // Index in Meilisearch
  indexDocument('entities', {
    id: row.id,
    ownerId,
    agentId,
    name: row.name,
    type: row.type,
  });

  logAuditEvent({
    eventType: 'entity.created',
    actorId: agentId,
    targetId: row.id,
    targetType: 'entity',
    ownerId,
    payload: { type: row.type, name: row.name },
  });

  return row;
}

export async function listEntities(
  agentId: string,
  ownerId: string,
  filters: EntityList,
) {
  const conditions = [
    eq(entities.ownerId, ownerId),
    eq(entities.agentId, agentId),
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

  return { data, total: countResult[0].count, limit: filters.limit, offset: filters.offset };
}

export async function getEntity(id: string, agentId: string, ownerId: string) {
  const [entity] = await db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
        eq(entities.agentId, agentId),
      ),
    )
    .limit(1);

  if (!entity) return null;

  // Fetch relations where this entity is either "from" or "to"
  const entityRelations = await db
    .select()
    .from(relations)
    .where(
      and(
        eq(relations.ownerId, ownerId),
        eq(relations.agentId, agentId),
        or(
          eq(relations.fromEntityId, id),
          eq(relations.toEntityId, id),
        ),
      ),
    );

  return { ...entity, relations: entityRelations };
}

export async function updateEntity(id: string, agentId: string, ownerId: string, data: EntityUpdate) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.properties !== undefined) updates.properties = data.properties;
  if (data.archived === true) updates.archivedAt = new Date();
  if (data.archived === false) updates.archivedAt = null;

  // Re-generate embedding if name or properties changed
  if (data.name !== undefined || data.properties !== undefined) {
    const [current] = await db
      .select({ name: entities.name, type: entities.type, properties: entities.properties })
      .from(entities)
      .where(
        and(
          eq(entities.id, id),
          eq(entities.ownerId, ownerId),
          eq(entities.agentId, agentId),
        ),
      )
      .limit(1);

    if (current) {
      const newName = data.name ?? current.name;
      const newProps = data.properties ?? current.properties;
      const embeddingText = `${newName} ${current.type} ${JSON.stringify(newProps)}`;
      const embedding = await generateEmbedding(embeddingText);
      if (embedding.length > 0) {
        updates.embedding = embedding;
      }
    }
  }

  const [row] = await db
    .update(entities)
    .set(updates)
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
        eq(entities.agentId, agentId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function archiveEntity(id: string, agentId: string, ownerId: string) {
  const [row] = await db
    .update(entities)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(entities.id, id),
        eq(entities.ownerId, ownerId),
        eq(entities.agentId, agentId),
      ),
    )
    .returning();

  if (row) {
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

export async function createRelation(agentId: string, ownerId: string, data: RelationCreate) {
  // Verify both entities exist and belong to the same owner+agent
  const found = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.ownerId, ownerId),
        eq(entities.agentId, agentId),
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
    })
    .returning();

  logAuditEvent({
    eventType: 'relation.created',
    actorId: agentId,
    targetId: row.id,
    targetType: 'relation',
    ownerId,
    payload: { relation: row.relation, from: row.fromEntityId, to: row.toEntityId },
  });

  return row;
}

export async function listRelations(
  agentId: string,
  ownerId: string,
  filters: { entityId?: string; relation?: string; limit: number; offset: number },
) {
  const conditions = [
    eq(relations.ownerId, ownerId),
    eq(relations.agentId, agentId),
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

  return { data, total: countResult[0].count, limit: filters.limit, offset: filters.offset };
}

export async function deleteRelation(id: string, agentId: string, ownerId: string) {
  const [row] = await db
    .delete(relations)
    .where(
      and(
        eq(relations.id, id),
        eq(relations.ownerId, ownerId),
        eq(relations.agentId, agentId),
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
        AND e.agent_id = ${agentId}
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
        AND r.agent_id = ${agentId}
        ${relationFilter}
      JOIN entities e2 ON e2.id = r.to_entity_id
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
  const embedding = await generateEmbedding(query);

  let vectorResults: { id: string; type: string; name: string; properties: unknown; archivedAt: Date | null; createdAt: Date; updatedAt: Date; score: number }[] = [];

  if (embedding.length > 0) {
    const vectorStr = `[${embedding.join(',')}]`;
    vectorResults = await db
      .select({
        id: entities.id,
        type: entities.type,
        name: entities.name,
        properties: entities.properties,
        archivedAt: entities.archivedAt,
        createdAt: entities.createdAt,
        updatedAt: entities.updatedAt,
        score: sql<number>`1 - (${entities.embedding} <=> ${vectorStr})`,
      })
      .from(entities)
      .where(
        and(
          eq(entities.ownerId, ownerId),
          eq(entities.agentId, agentId),
          isNull(entities.archivedAt),
          sql`${entities.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(sql`${entities.embedding} <=> ${vectorStr}`)
      .limit(limit);
  }

  // Meilisearch text search
  const textResults = await searchDocuments(
    'entities',
    query,
    `ownerId = "${ownerId}" AND agentId = "${agentId}"`,
    limit,
  );

  const textHitIds = new Set((textResults.hits as Array<{ id: string }>).map((h) => h.id));
  const merged = vectorResults
    .map((r) => ({
      data: {
        id: r.id,
        type: r.type,
        name: r.name,
        properties: r.properties,
        archivedAt: r.archivedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
      score: textHitIds.has(r.id) ? Math.min(r.score + 0.05, 1) : r.score,
    }))
    .filter((r) => r.score >= minScore);

  return merged;
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
