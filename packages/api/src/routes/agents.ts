import { Hono, type Context, type Next } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agents } from '../db/schema.js';
import {
  AgentCreateSchema,
  AgentUpdateSchema,
  LearningListSchema,
  MemoryListSchema,
  PaginationSchema,
  RelationListSchema,
  SearchQuerySchema,
  SkillListSchema,
  MEMORY_CATEGORIES,
  EntityListSchema,
} from '@swarmrecall/shared';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { listLearnings, getPatterns } from '../services/learnings.js';
import { listEntities, listRelations, searchEntities } from '../services/knowledge.js';
import { listMemories, listSessions, searchMemories } from '../services/memory.js';
import { listSkills } from '../services/skills.js';
import { getAgentStats } from '../services/stats.js';

const DashboardMemorySearchSchema = SearchQuerySchema.extend({
  category: z.enum(MEMORY_CATEGORIES).optional(),
});

const DashboardKnowledgeSearchSchema = SearchQuerySchema.extend({
  type: z.string().min(1).optional(),
});

type OwnedAgent = typeof agents.$inferSelect;

const agentsRouter = new Hono();

async function loadOwnedAgent(c: Context, next: Next) {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing agent id' }, 400);
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.ownerId, auth.ownerId)))
    .limit(1);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  c.set('agentRecord', agent);
  await next();
}

function getOwnedAgentFromContext(c: Context) {
  return c.get('agentRecord' as never) as OwnedAgent;
}

// POST / — Create agent
agentsRouter.post('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const body = await c.req.json();
  const parsed = AgentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const [agent] = await db
    .insert(agents)
    .values({
      ownerId: auth.ownerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();

  await logAuditEvent({
    eventType: 'agent.created',
    actorId: auth.ownerId,
    targetId: agent.id,
    targetType: 'agent',
    ownerId: auth.ownerId,
    payload: { name: agent.name },
  });

  return c.json(agent, 201);
});

// GET / — List owner's agents
agentsRouter.get('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;

  const data = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerId, auth.ownerId))
    .orderBy(agents.createdAt);

  return c.json({ data });
});

agentsRouter.use('/:id', loadOwnedAgent);
agentsRouter.use('/:id/*', loadOwnedAgent);

// GET /:id/stats — Agent counts for dashboard
agentsRouter.get('/:id/stats', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);
  const stats = await getAgentStats(agent.id, auth.ownerId);
  return c.json(stats);
});

// GET /:id/memory — List or search memories for the dashboard
agentsRouter.get('/:id/memory', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);

  const searchQuery = c.req.query('q');
  if (searchQuery) {
    const parsed = DashboardMemorySearchSchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    let data = await searchMemories(
      agent.id,
      auth.ownerId,
      parsed.data.q,
      parsed.data.limit,
      parsed.data.minScore,
    );

    if (parsed.data.category) {
      data = data.filter((result) => result.data.category === parsed.data.category);
    }

    return c.json({
      data: data.map((result) => ({ ...result.data, score: result.score })),
      total: data.length,
      limit: parsed.data.limit,
      offset: 0,
    });
  }

  const parsed = MemoryListSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listMemories(agent.id, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /:id/memory/sessions — List sessions for the dashboard
agentsRouter.get('/:id/memory/sessions', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);
  const parsed = PaginationSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listSessions(agent.id, auth.ownerId, parsed.data.limit, parsed.data.offset);
  return c.json(result);
});

// GET /:id/knowledge/entities — List or search entities for the dashboard
agentsRouter.get('/:id/knowledge/entities', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);

  const searchQuery = c.req.query('q');
  if (searchQuery) {
    const parsed = DashboardKnowledgeSearchSchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    let data = await searchEntities(
      agent.id,
      auth.ownerId,
      parsed.data.q,
      parsed.data.limit,
      parsed.data.minScore,
    );

    if (parsed.data.type) {
      data = data.filter((result) => result.data.type === parsed.data.type);
    }

    return c.json({
      data: data.map((result) => ({ ...result.data, score: result.score })),
      total: data.length,
      limit: parsed.data.limit,
      offset: 0,
    });
  }

  const parsed = EntityListSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listEntities(agent.id, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /:id/knowledge/relations — List relations for the dashboard
agentsRouter.get('/:id/knowledge/relations', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);
  const parsed = RelationListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listRelations(agent.id, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /:id/learnings — List learnings for the dashboard
agentsRouter.get('/:id/learnings', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);
  const parsed = LearningListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listLearnings(agent.id, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /:id/learnings/patterns — List learning patterns for the dashboard
agentsRouter.get('/:id/learnings/patterns', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);
  const data = await getPatterns(agent.id, auth.ownerId);
  return c.json({ data });
});

// GET /:id/skills — List skills for the dashboard
agentsRouter.get('/:id/skills', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agent = getOwnedAgentFromContext(c);
  const parsed = SkillListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listSkills(agent.id, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /:id — Get agent detail
agentsRouter.get('/:id', async (c) => {
  const agent = getOwnedAgentFromContext(c);
  return c.json(agent);
});

// PATCH /:id — Update agent
agentsRouter.patch('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing agent id' }, 400);
  }
  const body = await c.req.json();
  const parsed = AgentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const [updated] = await db
    .update(agents)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(and(eq(agents.id, id), eq(agents.ownerId, auth.ownerId)))
    .returning();

  if (!updated) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json(updated);
});

// DELETE /:id — Soft delete (set status to 'deleted')
agentsRouter.delete('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing agent id' }, 400);
  }

  const [updated] = await db
    .update(agents)
    .set({
      status: 'deleted',
      updatedAt: new Date(),
    })
    .where(and(eq(agents.id, id), eq(agents.ownerId, auth.ownerId)))
    .returning();

  if (!updated) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  await logAuditEvent({
    eventType: 'agent.deleted',
    actorId: auth.ownerId,
    targetId: id,
    targetType: 'agent',
    ownerId: auth.ownerId,
  });

  return c.json({ success: true });
});

export default agentsRouter;
