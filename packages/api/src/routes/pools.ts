import { Hono } from 'hono';
import {
  PoolCreateSchema,
  PoolUpdateSchema,
  PoolMemberAddSchema,
  PoolMemberUpdateSchema,
} from '@swarmrecall/shared';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import { parseJsonBody } from '../lib/request.js';
import {
  createPool,
  listPools,
  getPool,
  updatePool,
  archivePool,
  addPoolMember,
  updatePoolMember,
  removePoolMember,
} from '../services/pools.js';

const poolsRouter = new Hono();

// POST / — Create a pool
poolsRouter.post('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = PoolCreateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await createPool(auth.ownerId, parsed.data);
  return c.json(row, 201);
});

// GET / — List owner's pools
poolsRouter.get('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const data = await listPools(auth.ownerId);
  return c.json({ data });
});

// GET /:id — Get pool details + members
poolsRouter.get('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing pool id' }, 400);

  const pool = await getPool(id, auth.ownerId);
  if (!pool) return c.json({ error: 'Pool not found' }, 404);

  return c.json(pool);
});

// PATCH /:id — Update pool
poolsRouter.patch('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing pool id' }, 400);

  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = PoolUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await updatePool(id, auth.ownerId, parsed.data);
  if (!row) return c.json({ error: 'Pool not found' }, 404);

  return c.json(row);
});

// DELETE /:id — Archive pool
poolsRouter.delete('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing pool id' }, 400);

  const row = await archivePool(id, auth.ownerId);
  if (!row) return c.json({ error: 'Pool not found' }, 404);

  return c.json({ message: 'Pool archived' });
});

// POST /:id/members — Add agent to pool
poolsRouter.post('/:id/members', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing pool id' }, 400);

  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = PoolMemberAddSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const row = await addPoolMember(id, auth.ownerId, parsed.data);
    return c.json(row, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// PATCH /:id/members/:agentId — Update member access levels
poolsRouter.patch('/:id/members/:agentId', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  const agentId = c.req.param('agentId');
  if (!id || !agentId) return c.json({ error: 'Missing pool or agent id' }, 400);

  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = PoolMemberUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await updatePoolMember(id, agentId, auth.ownerId, parsed.data);
  if (!row) return c.json({ error: 'Member not found' }, 404);

  return c.json(row);
});

// DELETE /:id/members/:agentId — Remove agent from pool
poolsRouter.delete('/:id/members/:agentId', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');
  const agentId = c.req.param('agentId');
  if (!id || !agentId) return c.json({ error: 'Missing pool or agent id' }, 400);

  const row = await removePoolMember(id, agentId, auth.ownerId);
  if (!row) return c.json({ error: 'Member not found' }, 404);

  return c.json({ message: 'Member removed' });
});

export default poolsRouter;
