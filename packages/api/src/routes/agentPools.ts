import { Hono } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { poolMembers, pools } from '../db/schema.js';
import type { AgentAuthPayload } from '../middleware/auth.js';
import { requireScope } from '../middleware/auth.js';
import { getAgentPools, getPool } from '../services/pools.js';

const agentPoolsRouter = new Hono();

// GET / — List pools this agent belongs to
agentPoolsRouter.get('/', requireScope('pools.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const data = await getAgentPools(auth.agentId, auth.ownerId);
  return c.json({ data });
});

// GET /:id — Get pool detail (only if agent is a member)
agentPoolsRouter.get('/:id', requireScope('pools.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing pool id' }, 400);

  // Verify agent is a member with a single query
  const [membership] = await db
    .select({ poolId: poolMembers.poolId })
    .from(poolMembers)
    .innerJoin(pools, eq(pools.id, poolMembers.poolId))
    .where(
      and(
        eq(poolMembers.poolId, id),
        eq(poolMembers.agentId, auth.agentId),
        eq(poolMembers.ownerId, auth.ownerId),
        isNull(pools.archivedAt),
      ),
    )
    .limit(1);

  if (!membership) return c.json({ error: 'Pool not found' }, 404);

  const pool = await getPool(id, auth.ownerId);
  if (!pool) return c.json({ error: 'Pool not found' }, 404);

  return c.json(pool);
});

export default agentPoolsRouter;
