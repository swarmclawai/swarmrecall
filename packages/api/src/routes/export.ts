import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { memories, memorySessions, entities, relations, learnings, agentSkills } from '../db/schema.js';
import type { AgentAuthPayload } from '../middleware/auth.js';

const exportRouter = new Hono();

exportRouter.get('/', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const modules = c.req.query('modules')?.split(',') ?? ['memory', 'knowledge', 'learnings', 'skills'];

  const result: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    agentId: auth.agentId,
  };

  if (modules.includes('memory')) {
    const [mems, sessions] = await Promise.all([
      db.select().from(memories).where(and(eq(memories.ownerId, auth.ownerId), eq(memories.agentId, auth.agentId))),
      db.select().from(memorySessions).where(and(eq(memorySessions.ownerId, auth.ownerId), eq(memorySessions.agentId, auth.agentId))),
    ]);
    result.memories = mems;
    result.sessions = sessions;
  }

  if (modules.includes('knowledge')) {
    const [ents, rels] = await Promise.all([
      db.select().from(entities).where(and(eq(entities.ownerId, auth.ownerId), eq(entities.agentId, auth.agentId))),
      db.select().from(relations).where(and(eq(relations.ownerId, auth.ownerId), eq(relations.agentId, auth.agentId))),
    ]);
    result.entities = ents;
    result.relations = rels;
  }

  if (modules.includes('learnings')) {
    const lrns = await db.select().from(learnings).where(and(eq(learnings.ownerId, auth.ownerId), eq(learnings.agentId, auth.agentId)));
    result.learnings = lrns;
  }

  if (modules.includes('skills')) {
    const skls = await db.select().from(agentSkills).where(and(eq(agentSkills.ownerId, auth.ownerId), eq(agentSkills.agentId, auth.agentId)));
    result.skills = skls;
  }

  c.header('Content-Disposition', `attachment; filename="swarmrecall-export-${auth.agentId}.json"`);
  return c.json(result);
});

export default exportRouter;
