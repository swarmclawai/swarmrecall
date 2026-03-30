import { Hono } from 'hono';
import {
  EntityCreateSchema,
  EntityListSchema,
  EntityUpdateSchema,
  RelationCreateSchema,
  RelationListSchema,
  TraverseSchema,
  SearchQuerySchema,
  EntityTypeCreateSchema,
} from '@swarmrecall/shared';
import type { AgentAuthPayload } from '../middleware/auth.js';
import {
  createEntity,
  listEntities,
  getEntity,
  updateEntity,
  archiveEntity,
  createRelation,
  listRelations,
  deleteRelation,
  traverse,
  searchEntities,
  validateConstraints,
  createEntityType,
  listEntityTypes,
} from '../services/knowledge.js';
import { requireScope } from '../middleware/auth.js';

const knowledge = new Hono();

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

// POST /entities — Create entity
knowledge.post('/entities', requireScope('knowledge.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const body = await c.req.json();
  const parsed = EntityCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await createEntity(auth.agentId, auth.ownerId, parsed.data);
  return c.json(row, 201);
});

// GET /entities — List entities (paginated, filterable)
knowledge.get('/entities', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = EntityListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listEntities(auth.agentId, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /entities/:id — Get entity with its relations
knowledge.get('/entities/:id', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing entity id' }, 400);
  }

  const result = await getEntity(id, auth.agentId, auth.ownerId);
  if (!result) {
    return c.json({ error: 'Entity not found' }, 404);
  }

  return c.json(result);
});

// PATCH /entities/:id — Update entity
knowledge.patch('/entities/:id', requireScope('knowledge.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing entity id' }, 400);
  }
  const body = await c.req.json();
  const parsed = EntityUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await updateEntity(id, auth.agentId, auth.ownerId, parsed.data);
  if (!row) {
    return c.json({ error: 'Entity not found' }, 404);
  }

  return c.json(row);
});

// DELETE /entities/:id — Soft delete (archive)
knowledge.delete('/entities/:id', requireScope('knowledge.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing entity id' }, 400);
  }

  const row = await archiveEntity(id, auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'Entity not found' }, 404);
  }

  return c.json({ message: 'Entity archived' });
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

// POST /relations — Create relation
knowledge.post('/relations', requireScope('knowledge.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const body = await c.req.json();
  const parsed = RelationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await createRelation(auth.agentId, auth.ownerId, parsed.data);
  if (!row) {
    return c.json({ error: 'One or both entities not found or do not belong to this agent' }, 404);
  }

  return c.json(row, 201);
});

// GET /relations — List relations (paginated, filterable)
knowledge.get('/relations', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = RelationListSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listRelations(auth.agentId, auth.ownerId, parsed.data);
  return c.json(result);
});

// DELETE /relations/:id — Hard delete relation
knowledge.delete('/relations/:id', requireScope('knowledge.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing relation id' }, 400);
  }

  const row = await deleteRelation(id, auth.agentId, auth.ownerId);
  if (!row) {
    return c.json({ error: 'Relation not found' }, 404);
  }

  return c.json({ message: 'Relation deleted' });
});

// ---------------------------------------------------------------------------
// Graph traversal
// ---------------------------------------------------------------------------

// GET /traverse — Recursive graph traversal
knowledge.get('/traverse', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = TraverseSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await traverse(
    auth.agentId,
    auth.ownerId,
    parsed.data.startId,
    parsed.data.relation,
    parsed.data.depth,
    parsed.data.limit,
  );

  return c.json(result);
});

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------

// GET /search — Semantic search over entities
knowledge.get('/search', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsed = SearchQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const results = await searchEntities(
    auth.agentId,
    auth.ownerId,
    parsed.data.q,
    parsed.data.limit,
    parsed.data.minScore,
  );

  return c.json({ data: results });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// POST /validate — Validate entity type constraints
knowledge.post('/validate', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;

  const result = await validateConstraints(auth.agentId, auth.ownerId);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// Entity types
// ---------------------------------------------------------------------------

// POST /types — Create entity type
knowledge.post('/types', requireScope('knowledge.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const body = await c.req.json();
  const parsed = EntityTypeCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const row = await createEntityType(auth.ownerId, parsed.data);
  return c.json(row, 201);
});

// GET /types — List entity types
knowledge.get('/types', requireScope('knowledge.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;

  const rows = await listEntityTypes(auth.ownerId);
  return c.json({ data: rows });
});

export default knowledge;
