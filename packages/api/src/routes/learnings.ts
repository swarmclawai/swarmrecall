import { Hono } from 'hono';
import {
  LearningCreateSchema,
  LearningUpdateSchema,
  LearningListSchema,
  LearningLinkSchema,
  SearchQuerySchema,
} from '@swarmrecall/shared';
import type { AgentAuthPayload } from '../middleware/auth.js';
import {
  logLearning,
  listLearnings,
  searchLearnings,
  getLearning,
  updateLearning,
  getPatterns,
  getPromotionCandidates,
  linkLearnings,
} from '../services/learnings.js';

const learningsRouter = new Hono();

// POST / — Log a new learning
learningsRouter.post('/', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const body = await c.req.json();
  const parsed = LearningCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await logLearning(auth.agentId, auth.ownerId, parsed.data);
  return c.json(result, 201);
});

// GET / — List learnings (paginated, filtered)
learningsRouter.get('/', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const query = c.req.query();
  const parsed = LearningListSchema.safeParse(query);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listLearnings(auth.agentId, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /search — Semantic search
learningsRouter.get('/search', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const query = c.req.query();
  const parsed = SearchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await searchLearnings(
    auth.agentId,
    auth.ownerId,
    parsed.data.q,
    parsed.data.limit,
    parsed.data.minScore,
  );
  return c.json(result);
});

// GET /patterns — List learning patterns
learningsRouter.get('/patterns', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const patterns = await getPatterns(auth.agentId, auth.ownerId);
  return c.json({ data: patterns });
});

// GET /promotions — Promotion candidates
learningsRouter.get('/promotions', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const candidates = await getPromotionCandidates(auth.agentId, auth.ownerId);
  return c.json({ data: candidates });
});

// GET /:id — Get single learning
learningsRouter.get('/:id', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  const learning = await getLearning(id, auth.agentId, auth.ownerId);

  if (!learning) {
    return c.json({ error: 'Learning not found' }, 404);
  }

  return c.json(learning);
});

// PATCH /:id — Update learning
learningsRouter.patch('/:id', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = LearningUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const updated = await updateLearning(id, auth.agentId, auth.ownerId, parsed.data);

  if (!updated) {
    return c.json({ error: 'Learning not found' }, 404);
  }

  return c.json(updated);
});

// POST /:id/link — Link related learnings
learningsRouter.post('/:id/link', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = LearningLinkSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await linkLearnings(id, parsed.data.targetId, auth.agentId, auth.ownerId);

  if ('error' in result) {
    return c.json({ error: result.error }, 404);
  }

  return c.json(result);
});

export default learningsRouter;
