import { Hono } from 'hono';
import {
  DreamTriggerSchema,
  DreamListSchema,
  DreamCycleUpdateSchema,
  DreamConfigUpdateSchema,
  DreamExecuteSchema,
  CandidateQuerySchema,
} from '@swarmrecall/shared';
import type { AgentAuthPayload } from '../middleware/auth.js';
import { parseJsonBody } from '../lib/request.js';
import { requireScope } from '../middleware/auth.js';
import {
  startDreamCycle,
  getDreamCycle,
  listDreamCycles,
  updateDreamCycle,
  getDreamConfig,
  upsertDreamConfig,
  findDuplicateClusters,
  findUnsummarizedSessions,
  findDuplicateEntities,
  findStaleMemories,
  findContradictions,
  findUnprocessedMemories,
  executeTier1,
} from '../services/dream.js';

const dream = new Hono();

// ---------------------------------------------------------------------------
// POST / — Start a dream cycle
// ---------------------------------------------------------------------------
dream.post('/', requireScope('dream.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsedBody = await parseJsonBody(c);

  let input;
  if (parsedBody.ok && parsedBody.data) {
    const parsed = DreamTriggerSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }
    input = parsed.data;
  }

  const cycle = await startDreamCycle({
    agentId: auth.agentId,
    ownerId: auth.ownerId,
    input,
    trigger: 'api',
  });

  return c.json(cycle, 201);
});

// ---------------------------------------------------------------------------
// GET / — List dream cycles
// ---------------------------------------------------------------------------
dream.get('/', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = DreamListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listDreamCycles(auth.ownerId, parsed.data, auth.agentId);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /config — Get dream config
// ---------------------------------------------------------------------------
dream.get('/config', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const config = await getDreamConfig(auth.agentId, auth.ownerId);
  return c.json(config);
});

// ---------------------------------------------------------------------------
// PATCH /config — Update dream config
// ---------------------------------------------------------------------------
dream.patch('/config', requireScope('dream.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = DreamConfigUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const config = await upsertDreamConfig(auth.agentId, auth.ownerId, parsed.data);
  return c.json(config);
});

// ---------------------------------------------------------------------------
// Candidate endpoints
// ---------------------------------------------------------------------------

dream.get('/candidates/duplicates', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = CandidateQuerySchema.safeParse(c.req.query());
  const limit = parsed.success ? parsed.data.limit : 50;
  const result = await findDuplicateClusters(auth.agentId, auth.ownerId, undefined, limit);
  return c.json(result);
});

dream.get('/candidates/unsummarized-sessions', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = CandidateQuerySchema.safeParse(c.req.query());
  const limit = parsed.success ? parsed.data.limit : 50;
  const result = await findUnsummarizedSessions(auth.agentId, auth.ownerId, limit);
  return c.json(result);
});

dream.get('/candidates/duplicate-entities', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = CandidateQuerySchema.safeParse(c.req.query());
  const limit = parsed.success ? parsed.data.limit : 50;
  const result = await findDuplicateEntities(auth.agentId, auth.ownerId, undefined, limit);
  return c.json(result);
});

dream.get('/candidates/stale', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = CandidateQuerySchema.safeParse(c.req.query());
  const limit = parsed.success ? parsed.data.limit : 100;
  const result = await findStaleMemories(auth.agentId, auth.ownerId, undefined, limit);
  return c.json(result);
});

dream.get('/candidates/contradictions', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = CandidateQuerySchema.safeParse(c.req.query());
  const limit = parsed.success ? parsed.data.limit : 50;
  const result = await findContradictions(auth.agentId, auth.ownerId, undefined, limit);
  return c.json(result);
});

dream.get('/candidates/unprocessed', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = CandidateQuerySchema.safeParse(c.req.query());
  const limit = parsed.success ? parsed.data.limit : 100;
  const result = await findUnprocessedMemories(auth.agentId, auth.ownerId, limit);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// POST /execute — Run Tier 1 operations server-side
// ---------------------------------------------------------------------------
dream.post('/execute', requireScope('dream.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;

  let thresholds;
  const parsedBody = await parseJsonBody(c);
  if (parsedBody.ok && parsedBody.data) {
    const parsed = DreamExecuteSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }
  }

  const result = await executeTier1(auth.agentId, auth.ownerId, thresholds);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /:id — Get a dream cycle (must be after all named routes)
// ---------------------------------------------------------------------------
dream.get('/:id', requireScope('dream.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id')!;
  const row = await getDreamCycle(id, auth.ownerId);

  if (!row) {
    return c.json({ error: 'Dream cycle not found' }, 404);
  }

  return c.json(row);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update a dream cycle
// ---------------------------------------------------------------------------
dream.patch('/:id', requireScope('dream.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id')!;
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = DreamCycleUpdateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await updateDreamCycle(id, auth.ownerId, parsed.data);

  if (!row) {
    return c.json({ error: 'Dream cycle not found' }, 404);
  }

  return c.json(row);
});

export default dream;
