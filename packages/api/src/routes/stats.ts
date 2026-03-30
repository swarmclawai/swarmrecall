import { Hono } from 'hono';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import { getOwnedActiveAgent } from '../services/agents.js';
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
  const agent = await getOwnedActiveAgent(agentId, auth.ownerId);

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const stats = await getAgentStats(agentId, auth.ownerId);
  return c.json(stats);
});

export default statsRouter;
