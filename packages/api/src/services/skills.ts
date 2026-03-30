import { eq, and, or, desc, sql, isNull, inArray, SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agentSkills } from '../db/schema.js';
import { generateEmbedding } from '../lib/embeddings.js';
import { searchIndex } from './search.js';
import { logAuditEvent } from './audit.js';
import { getReadablePoolIds, validatePoolWrite, annotatePoolNames } from './poolAccess.js';
import { SIMILARITY_THRESHOLD } from '@swarmrecall/shared';
import type { SkillRegister, SkillUpdate, SkillList } from '@swarmrecall/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vectorToSql(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

// ---------------------------------------------------------------------------
// registerSkill
// ---------------------------------------------------------------------------

export async function registerSkill(agentId: string, ownerId: string, data: SkillRegister) {
  if (data.poolId) {
    await validatePoolWrite(agentId, ownerId, data.poolId, 'skills');
  }

  const [skill] = await db
    .insert(agentSkills)
    .values({
      agentId,
      ownerId,
      name: data.name,
      version: data.version ?? null,
      source: data.source ?? null,
      description: data.description ?? null,
      triggers: data.triggers,
      dependencies: data.dependencies,
      config: data.config ?? null,
      poolId: data.poolId ?? null,
    })
    .returning();

  // Index in Meilisearch
  await searchIndex.indexDocument('skills', {
    id: skill.id,
    agentId,
    ownerId,
    poolId: skill.poolId,
    name: skill.name,
    description: skill.description,
    source: skill.source,
    status: skill.status,
  });

  await logAuditEvent({
    eventType: 'skill.registered',
    actorId: agentId,
    targetId: skill.id,
    targetType: 'skill',
    ownerId,
    payload: { name: skill.name, poolId: data.poolId },
  });

  const [annotated] = await annotatePoolNames([skill]);
  return annotated;
}

// ---------------------------------------------------------------------------
// listSkills
// ---------------------------------------------------------------------------

export async function listSkills(agentId: string, ownerId: string, filters: SkillList) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'skills');

  const agentCondition = readablePoolIds.length > 0
    ? or(eq(agentSkills.agentId, agentId), inArray(agentSkills.poolId, readablePoolIds))!
    : eq(agentSkills.agentId, agentId);

  const conditions: SQL[] = [
    eq(agentSkills.ownerId, ownerId),
    agentCondition,
  ];

  if (filters.status) {
    conditions.push(eq(agentSkills.status, filters.status));
  }

  const where = and(...conditions)!;

  const [data, [{ count }]] = await Promise.all([
    db
      .select()
      .from(agentSkills)
      .where(where)
      .orderBy(desc(agentSkills.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentSkills)
      .where(where),
  ]);

  const annotated = await annotatePoolNames(data);
  return { data: annotated, total: count, limit: filters.limit, offset: filters.offset };
}

// ---------------------------------------------------------------------------
// getSkill
// ---------------------------------------------------------------------------

export async function getSkill(id: string, agentId: string, ownerId: string) {
  const [row] = await db
    .select()
    .from(agentSkills)
    .where(
      and(
        eq(agentSkills.id, id),
        eq(agentSkills.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Check access: own data or pool data the agent can read
  if (row.agentId !== agentId) {
    if (!row.poolId) return null;
    const readable = await getReadablePoolIds(agentId, ownerId, 'skills');
    if (!readable.includes(row.poolId)) return null;
  }

  const [annotated] = await annotatePoolNames([row]);
  return annotated;
}

// ---------------------------------------------------------------------------
// updateSkill
// ---------------------------------------------------------------------------

export async function updateSkill(
  id: string,
  agentId: string,
  ownerId: string,
  data: SkillUpdate,
) {
  // Load first to check pool write access
  const existing = await getSkill(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'skills');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const [updated] = await db
    .update(agentSkills)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentSkills.id, id),
        eq(agentSkills.ownerId, ownerId),
      ),
    )
    .returning();

  if (updated) {
    // Re-index in Meilisearch
    await searchIndex.indexDocument('skills', {
      id: updated.id,
      agentId: updated.agentId,
      ownerId,
      poolId: updated.poolId,
      name: updated.name,
      description: updated.description,
      source: updated.source,
      status: updated.status,
    });
  }

  return updated ?? null;
}

// ---------------------------------------------------------------------------
// removeSkill
// ---------------------------------------------------------------------------

export async function removeSkill(id: string, agentId: string, ownerId: string) {
  // Load first to check pool write access
  const existing = await getSkill(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'skills');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const [deleted] = await db
    .delete(agentSkills)
    .where(
      and(
        eq(agentSkills.id, id),
        eq(agentSkills.ownerId, ownerId),
      ),
    )
    .returning();

  if (deleted) {
    await searchIndex.removeDocument('skills', id);

    await logAuditEvent({
      eventType: 'skill.removed',
      actorId: agentId,
      targetId: id,
      targetType: 'skill',
      ownerId,
      payload: { name: deleted.name },
    });
  }

  return deleted ?? null;
}

// ---------------------------------------------------------------------------
// suggestSkills
// ---------------------------------------------------------------------------

export async function suggestSkills(
  agentId: string,
  ownerId: string,
  context: string,
  limit: number = 5,
) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'skills');

  // Build Meilisearch filter to include pool data
  let meiliFilter = `ownerId = "${ownerId}" AND agentId = "${agentId}" AND status = "active"`;
  if (readablePoolIds.length > 0) {
    const poolFilter = readablePoolIds.map((id) => `poolId = "${id}"`).join(' OR ');
    meiliFilter = `ownerId = "${ownerId}" AND (agentId = "${agentId}" OR ${poolFilter}) AND status = "active"`;
  }

  // Generate embedding for the context
  const embedding = await generateEmbedding(context);

  if (embedding.length === 0) {
    // Fall back to Meilisearch text search
    const results = await searchIndex.searchDocuments(
      'skills',
      context,
      meiliFilter,
      limit,
    );
    return results.hits;
  }

  const vectorStr = vectorToSql(embedding);

  // Skills don't have their own embedding column, so we generate embeddings
  // from the description. We'll use Meilisearch + vector comparison on name+description.
  // Since agentSkills doesn't have an embedding column, use text search.
  const results = await searchIndex.searchDocuments(
    'skills',
    context,
    meiliFilter,
    limit,
  );

  return results.hits;
}

// ---------------------------------------------------------------------------
// detectConflicts
// ---------------------------------------------------------------------------

export async function detectConflicts(agentId: string, ownerId: string) {
  const readablePoolIds = await getReadablePoolIds(agentId, ownerId, 'skills');

  const agentCondition = readablePoolIds.length > 0
    ? or(eq(agentSkills.agentId, agentId), inArray(agentSkills.poolId, readablePoolIds))!
    : eq(agentSkills.agentId, agentId);

  // Get all active skills for this agent (including pool skills)
  const skills = await db
    .select()
    .from(agentSkills)
    .where(
      and(
        eq(agentSkills.ownerId, ownerId),
        agentCondition,
        eq(agentSkills.status, 'active'),
      ),
    );

  const conflicts: Array<{
    type: string;
    dependency: string;
    skills: Array<{ id: string; name: string; version: string | null }>;
  }> = [];

  // Build a map: dependency -> skills that use it
  const depMap = new Map<string, Array<{ id: string; name: string; version: string | null }>>();

  for (const skill of skills) {
    for (const dep of skill.dependencies) {
      // Normalize: "package@version" -> { package, version }
      const atIdx = dep.lastIndexOf('@');
      const depName = atIdx > 0 ? dep.slice(0, atIdx) : dep;

      if (!depMap.has(depName)) {
        depMap.set(depName, []);
      }
      depMap.get(depName)!.push({ id: skill.id, name: skill.name, version: skill.version });
    }
  }

  // Check for dependencies used by multiple skills (potential conflicts)
  for (const [depName, depSkills] of depMap.entries()) {
    if (depSkills.length > 1) {
      conflicts.push({
        type: 'shared_dependency',
        dependency: depName,
        skills: depSkills,
      });
    }
  }

  // Check for duplicate skill names
  const nameMap = new Map<string, Array<{ id: string; name: string }>>();
  for (const skill of skills) {
    const lower = skill.name.toLowerCase();
    if (!nameMap.has(lower)) {
      nameMap.set(lower, []);
    }
    nameMap.get(lower)!.push({ id: skill.id, name: skill.name });
  }

  for (const [name, nameSkills] of nameMap.entries()) {
    if (nameSkills.length > 1) {
      conflicts.push({
        type: 'duplicate_name',
        dependency: name,
        skills: nameSkills.map((s) => ({ ...s, version: null })),
      });
    }
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// reportUsage
// ---------------------------------------------------------------------------

export async function reportUsage(
  id: string,
  agentId: string,
  ownerId: string,
  success: boolean,
) {
  // Load first to check pool write access
  const existing = await getSkill(id, agentId, ownerId);
  if (!existing) return null;
  if (existing.poolId) {
    await validatePoolWrite(agentId, ownerId, existing.poolId, 'skills');
  } else if (existing.agentId !== agentId) {
    return null;
  }

  const field = success ? agentSkills.invocationCount : agentSkills.errorCount;

  const [updated] = await db
    .update(agentSkills)
    .set({
      [success ? 'invocationCount' : 'errorCount']: sql`${field} + 1`,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentSkills.id, id),
        eq(agentSkills.ownerId, ownerId),
      ),
    )
    .returning();

  return updated ?? null;
}
