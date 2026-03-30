import { Hono } from 'hono';
import {
  MemoryCreateSchema,
  MemoryListSchema,
  MemoryUpdateSchema,
  SearchQuerySchema,
  SessionCreateSchema,
  SessionUpdateSchema,
  PaginationSchema,
} from '@swarmrecall/shared';
import type { AgentAuthPayload } from '../middleware/auth.js';
import {
  storeMemory,
  listMemories,
  searchMemories,
  getMemory,
  updateMemory,
  archiveMemory,
  startSession,
  updateSession,
  getCurrentSession,
  listSessions,
} from '../services/memory.js';

const memory = new Hono();

// ---------------------------------------------------------------------------
// POST / — Store a new memory
// ---------------------------------------------------------------------------
memory.post('/', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const body = await c.req.json();
  const parsed = MemoryCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await storeMemory(auth.agentId, auth.ownerId, parsed.data);
  return c.json(row, 201);
});

// ---------------------------------------------------------------------------
// GET / — List memories (paginated, filterable)
// ---------------------------------------------------------------------------
memory.get('/', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = MemoryListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listMemories(auth.agentId, auth.ownerId, parsed.data);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /search — Semantic + text search
// ---------------------------------------------------------------------------
memory.get('/search', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = SearchQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const results = await searchMemories(
    auth.agentId,
    auth.ownerId,
    parsed.data.q,
    parsed.data.limit,
    parsed.data.minScore,
  );

  return c.json({ data: results });
});

// ---------------------------------------------------------------------------
// GET /:id — Get single memory
// ---------------------------------------------------------------------------
memory.get('/:id', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');

  const row = await getMemory(id, auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'Memory not found' }, 404);
  }

  return c.json(row);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update memory
// ---------------------------------------------------------------------------
memory.patch('/:id', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = MemoryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await updateMemory(id, auth.agentId, auth.ownerId, parsed.data);
  if (!row) {
    return c.json({ error: 'Memory not found' }, 404);
  }

  return c.json(row);
});

// ---------------------------------------------------------------------------
// DELETE /:id — Soft delete (archive)
// ---------------------------------------------------------------------------
memory.delete('/:id', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');

  const row = await archiveMemory(id, auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'Memory not found' }, 404);
  }

  return c.json({ message: 'Memory archived' });
});

// ---------------------------------------------------------------------------
// POST /sessions — Start a new session
// ---------------------------------------------------------------------------
memory.post('/sessions', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const body = await c.req.json().catch(() => ({}));
  const parsed = SessionCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await startSession(auth.agentId, auth.ownerId, parsed.data.context);
  return c.json(row, 201);
});

// ---------------------------------------------------------------------------
// GET /sessions/current — Get latest active session
// ---------------------------------------------------------------------------
memory.get('/sessions/current', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;

  const row = await getCurrentSession(auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'No active session' }, 404);
  }

  return c.json(row);
});

// ---------------------------------------------------------------------------
// GET /sessions — List sessions (paginated)
// ---------------------------------------------------------------------------
memory.get('/sessions', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = PaginationSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listSessions(
    auth.agentId,
    auth.ownerId,
    parsed.data.limit,
    parsed.data.offset,
  );
  return c.json(result);
});

// ---------------------------------------------------------------------------
// PATCH /sessions/:id — Update session
// ---------------------------------------------------------------------------
memory.patch('/sessions/:id', async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = SessionUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await updateSession(id, auth.agentId, auth.ownerId, parsed.data);
  if (!row) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json(row);
});

export default memory;
