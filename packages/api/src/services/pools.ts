import { and, eq, isNull, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { pools, poolMembers, agents } from '../db/schema.js';
import { logAuditEvent } from './audit.js';
import type { PoolCreate, PoolUpdate, PoolMemberAdd, PoolMemberUpdate } from '@swarmrecall/shared';

// ---------------------------------------------------------------------------
// Pools CRUD
// ---------------------------------------------------------------------------

export async function createPool(ownerId: string, data: PoolCreate) {
  const [row] = await db
    .insert(pools)
    .values({
      ownerId,
      name: data.name,
      description: data.description ?? null,
    })
    .returning();

  logAuditEvent({
    eventType: 'pool.created',
    actorId: ownerId,
    targetId: row.id,
    targetType: 'pool',
    ownerId,
    payload: { name: row.name },
  });

  return row;
}

export async function listPools(ownerId: string) {
  return db
    .select()
    .from(pools)
    .where(and(eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .orderBy(desc(pools.createdAt));
}

export async function getPool(id: string, ownerId: string) {
  const [pool] = await db
    .select()
    .from(pools)
    .where(and(eq(pools.id, id), eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .limit(1);

  if (!pool) return null;

  const members = await db
    .select({
      id: poolMembers.id,
      poolId: poolMembers.poolId,
      agentId: poolMembers.agentId,
      ownerId: poolMembers.ownerId,
      memoryAccess: poolMembers.memoryAccess,
      knowledgeAccess: poolMembers.knowledgeAccess,
      learningsAccess: poolMembers.learningsAccess,
      skillsAccess: poolMembers.skillsAccess,
      joinedAt: poolMembers.joinedAt,
      agentName: agents.name,
    })
    .from(poolMembers)
    .innerJoin(agents, eq(agents.id, poolMembers.agentId))
    .where(eq(poolMembers.poolId, id));

  return { ...pool, members };
}

export async function updatePool(id: string, ownerId: string, data: PoolUpdate) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;

  const [row] = await db
    .update(pools)
    .set(updates)
    .where(and(eq(pools.id, id), eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .returning();

  if (row) {
    logAuditEvent({
      eventType: 'pool.updated',
      actorId: ownerId,
      targetId: id,
      targetType: 'pool',
      ownerId,
    });
  }

  return row ?? null;
}

export async function archivePool(id: string, ownerId: string) {
  const now = new Date();
  const [row] = await db
    .update(pools)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(pools.id, id), eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .returning();

  if (row) {
    logAuditEvent({
      eventType: 'pool.archived',
      actorId: ownerId,
      targetId: id,
      targetType: 'pool',
      ownerId,
    });
  }

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Pool Members
// ---------------------------------------------------------------------------

export async function addPoolMember(poolId: string, ownerId: string, data: PoolMemberAdd) {
  // Verify agent belongs to the same owner
  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, data.agentId), eq(agents.ownerId, ownerId), isNull(agents.archivedAt)))
    .limit(1);

  if (!agent) {
    throw new Error('Agent not found or belongs to a different owner');
  }

  // Verify pool exists and belongs to owner
  const [pool] = await db
    .select({ id: pools.id })
    .from(pools)
    .where(and(eq(pools.id, poolId), eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .limit(1);

  if (!pool) {
    throw new Error('Pool not found');
  }

  const [row] = await db
    .insert(poolMembers)
    .values({
      poolId,
      agentId: data.agentId,
      ownerId,
      memoryAccess: data.memoryAccess,
      knowledgeAccess: data.knowledgeAccess,
      learningsAccess: data.learningsAccess,
      skillsAccess: data.skillsAccess,
    })
    .onConflictDoNothing({ target: [poolMembers.poolId, poolMembers.agentId] })
    .returning();

  if (!row) {
    throw new Error('Agent is already a member of this pool');
  }

  logAuditEvent({
    eventType: 'pool.member.added',
    actorId: ownerId,
    targetId: poolId,
    targetType: 'pool',
    ownerId,
    payload: { agentId: data.agentId },
  });

  return row;
}

export async function updatePoolMember(
  poolId: string,
  agentId: string,
  ownerId: string,
  data: PoolMemberUpdate,
) {
  const [pool] = await db
    .select({ id: pools.id })
    .from(pools)
    .where(and(eq(pools.id, poolId), eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .limit(1);

  if (!pool) return null;

  const updates: Record<string, unknown> = {};
  if (data.memoryAccess !== undefined) updates.memoryAccess = data.memoryAccess;
  if (data.knowledgeAccess !== undefined) updates.knowledgeAccess = data.knowledgeAccess;
  if (data.learningsAccess !== undefined) updates.learningsAccess = data.learningsAccess;
  if (data.skillsAccess !== undefined) updates.skillsAccess = data.skillsAccess;

  if (Object.keys(updates).length === 0) return null;

  const [row] = await db
    .update(poolMembers)
    .set(updates)
    .where(
      and(
        eq(poolMembers.poolId, poolId),
        eq(poolMembers.agentId, agentId),
        eq(poolMembers.ownerId, ownerId),
      ),
    )
    .returning();

  if (row) {
    logAuditEvent({
      eventType: 'pool.member.updated',
      actorId: ownerId,
      targetId: poolId,
      targetType: 'pool',
      ownerId,
      payload: { agentId },
    });
  }

  return row ?? null;
}

export async function removePoolMember(poolId: string, agentId: string, ownerId: string) {
  const [pool] = await db
    .select({ id: pools.id })
    .from(pools)
    .where(and(eq(pools.id, poolId), eq(pools.ownerId, ownerId), isNull(pools.archivedAt)))
    .limit(1);

  if (!pool) return null;

  const [row] = await db
    .delete(poolMembers)
    .where(
      and(
        eq(poolMembers.poolId, poolId),
        eq(poolMembers.agentId, agentId),
        eq(poolMembers.ownerId, ownerId),
      ),
    )
    .returning();

  if (row) {
    logAuditEvent({
      eventType: 'pool.member.removed',
      actorId: ownerId,
      targetId: poolId,
      targetType: 'pool',
      ownerId,
      payload: { agentId },
    });
  }

  return row ?? null;
}

export async function getAgentPools(agentId: string, ownerId: string) {
  return db
    .select({
      id: pools.id,
      ownerId: pools.ownerId,
      name: pools.name,
      description: pools.description,
      createdAt: pools.createdAt,
      updatedAt: pools.updatedAt,
      memoryAccess: poolMembers.memoryAccess,
      knowledgeAccess: poolMembers.knowledgeAccess,
      learningsAccess: poolMembers.learningsAccess,
      skillsAccess: poolMembers.skillsAccess,
      joinedAt: poolMembers.joinedAt,
    })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(
      and(
        eq(poolMembers.agentId, agentId),
        eq(poolMembers.ownerId, ownerId),
        isNull(pools.archivedAt),
      ),
    )
    .orderBy(desc(pools.createdAt));
}
