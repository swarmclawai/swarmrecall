import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agentSkills, agents, entities, learnings, memories } from '../db/schema.js';

export async function getOwnerStats(ownerId: string) {
  const [agentCountRow, memoryCountRow, learningCountRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(and(eq(agents.ownerId, ownerId), isNull(agents.archivedAt))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memories)
      .where(and(eq(memories.ownerId, ownerId), isNull(memories.archivedAt))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(learnings)
      .where(and(eq(learnings.ownerId, ownerId), isNull(learnings.archivedAt))),
  ]);

  return {
    agentCount: agentCountRow[0]?.count ?? 0,
    totalMemories: memoryCountRow[0]?.count ?? 0,
    totalLearnings: learningCountRow[0]?.count ?? 0,
  };
}

export async function getAgentStats(agentId: string, ownerId: string) {
  const [memoryCountRow, knowledgeCountRow, learningCountRow, skillCountRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memories)
      .where(
        and(
          eq(memories.agentId, agentId),
          eq(memories.ownerId, ownerId),
          isNull(memories.archivedAt),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(entities)
      .where(
        and(
          eq(entities.agentId, agentId),
          eq(entities.ownerId, ownerId),
          isNull(entities.archivedAt),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(learnings)
      .where(
        and(
          eq(learnings.agentId, agentId),
          eq(learnings.ownerId, ownerId),
          isNull(learnings.archivedAt),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentSkills)
      .where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.ownerId, ownerId))),
  ]);

  return {
    memoryCount: memoryCountRow[0]?.count ?? 0,
    knowledgeCount: knowledgeCountRow[0]?.count ?? 0,
    learningCount: learningCountRow[0]?.count ?? 0,
    skillCount: skillCountRow[0]?.count ?? 0,
  };
}

