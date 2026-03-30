import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agents } from '../db/schema.js';

export function buildListOwnedActiveAgentsQuery(ownerId: string) {
  return db
    .select()
    .from(agents)
    .where(and(eq(agents.ownerId, ownerId), isNull(agents.archivedAt)))
    .orderBy(agents.createdAt);
}

export function buildGetOwnedActiveAgentQuery(agentId: string, ownerId: string) {
  return db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.ownerId, ownerId),
        isNull(agents.archivedAt),
      ),
    )
    .limit(1);
}

export async function listOwnedActiveAgents(ownerId: string) {
  return buildListOwnedActiveAgentsQuery(ownerId);
}

export async function getOwnedActiveAgent(agentId: string, ownerId: string) {
  const [agent] = await buildGetOwnedActiveAgentQuery(agentId, ownerId);
  return agent ?? null;
}

export function buildArchiveOwnedAgentQuery(agentId: string, ownerId: string, now: Date) {
  return db
    .update(agents)
    .set({
      status: 'deleted',
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.ownerId, ownerId),
        isNull(agents.archivedAt),
      ),
    )
    .returning();
}

export async function archiveOwnedAgent(agentId: string, ownerId: string) {
  const [agent] = await buildArchiveOwnedAgentQuery(agentId, ownerId, new Date());
  return agent ?? null;
}
