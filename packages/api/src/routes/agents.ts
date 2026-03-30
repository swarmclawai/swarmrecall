import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agents } from '../db/schema.js';
import { AgentCreateSchema, AgentUpdateSchema } from '@swarmrecall/shared';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import { logAuditEvent } from '../services/audit.js';

const agentsRouter = new Hono();

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

// GET /:id — Get agent detail
agentsRouter.get('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.ownerId, auth.ownerId)))
    .limit(1);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  return c.json(agent);
});

// PATCH /:id — Update agent
agentsRouter.patch('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
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
