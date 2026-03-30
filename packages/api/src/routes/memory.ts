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
import { parseJsonBody } from '../lib/request.js';
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
import { requireScope } from '../middleware/auth.js';

const memory = new Hono();

// ---------------------------------------------------------------------------
// POST / — Store a new memory
// ---------------------------------------------------------------------------
memory.post('/', requireScope('memory.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = MemoryCreateSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await storeMemory(auth.agentId, auth.ownerId, parsed.data);
  return c.json(row, 201);
});

// ---------------------------------------------------------------------------
// GET / — List memories (paginated, filterable)
// ---------------------------------------------------------------------------
memory.get('/', requireScope('memory.read'), async (c) => {
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
memory.get('/search', requireScope('memory.read'), async (c) => {
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
memory.get('/:id', requireScope('memory.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing memory id' }, 400);
  }

  const row = await getMemory(id, auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'Memory not found' }, 404);
  }

  return c.json(row);
});

// ---------------------------------------------------------------------------
// PATCH /:id — Update memory
// ---------------------------------------------------------------------------
memory.patch('/:id', requireScope('memory.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing memory id' }, 400);
  }
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = MemoryUpdateSchema.safeParse(parsedBody.data);

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
memory.delete('/:id', requireScope('memory.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing memory id' }, 400);
  }

  const row = await archiveMemory(id, auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'Memory not found' }, 404);
  }

  return c.json({ message: 'Memory archived' });
});

// ---------------------------------------------------------------------------
// POST /sessions — Start a new session
// ---------------------------------------------------------------------------
memory.post('/sessions', requireScope('memory.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsedBody = await parseJsonBody(c, { empty: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = SessionCreateSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await startSession(auth.agentId, auth.ownerId, parsed.data.context);
  return c.json(row, 201);
});

// ---------------------------------------------------------------------------
// GET /sessions/current — Get latest active session
// ---------------------------------------------------------------------------
memory.get('/sessions/current', requireScope('memory.read'), async (c) => {
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
memory.get('/sessions', requireScope('memory.read'), async (c) => {
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
memory.patch('/sessions/:id', requireScope('memory.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing session id' }, 400);
  }
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = SessionUpdateSchema.safeParse(parsedBody.data);

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
