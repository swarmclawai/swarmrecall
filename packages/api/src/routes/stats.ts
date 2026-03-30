import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { agents } from '../db/schema.js';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import { getOwnerStats, getAgentStats } from '../services/stats.js';

const statsRouter = new Hono();

// GET / — Owner-level stats
statsRouter.get('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const stats = await getOwnerStats(auth.ownerId);
  return c.json(stats);
});

// GET /agents/:id — Per-agent stats
statsRouter.get('/agents/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const agentId = c.req.param('id');

  // Verify agent belongs to owner
  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, auth.ownerId)))
    .limit(1);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const stats = await getAgentStats(agentId, auth.ownerId);
  return c.json(stats);
});

export default statsRouter;
