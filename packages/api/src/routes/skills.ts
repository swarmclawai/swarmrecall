import { Hono } from 'hono';
import {
  SkillRegisterSchema,
  SkillUpdateSchema,
  SkillListSchema,
  SkillUsageSchema,
} from '@swarmrecall/shared';
import type { AgentAuthPayload } from '../middleware/auth.js';
import { parseJsonBody } from '../lib/request.js';
import {
  registerSkill,
  listSkills,
  getSkill,
  updateSkill,
  removeSkill,
  suggestSkills,
  detectConflicts,
  reportUsage,
} from '../services/skills.js';
import { requireScope } from '../middleware/auth.js';

const skillsRouter = new Hono();

// POST / — Register a new skill
skillsRouter.post('/', requireScope('skills.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = SkillRegisterSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const skill = await registerSkill(auth.agentId, auth.ownerId, parsed.data);
  return c.json(skill, 201);
});

// GET / — List skills (paginated)
skillsRouter.get('/', requireScope('skills.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const query = c.req.query();
  const parsed = SkillListSchema.safeParse(query);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await listSkills(auth.agentId, auth.ownerId, parsed.data);
  return c.json(result);
});

// GET /suggest — Suggest skills based on context
skillsRouter.get('/suggest', requireScope('skills.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const context = c.req.query('context');

  if (!context) {
    return c.json({ error: 'Missing context query parameter' }, 400);
  }

  const limit = Number(c.req.query('limit') ?? '5');
  const suggestions = await suggestSkills(auth.agentId, auth.ownerId, context, limit);
  return c.json({ data: suggestions });
});

// GET /conflicts — Detect dependency conflicts
skillsRouter.get('/conflicts', requireScope('skills.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const conflicts = await detectConflicts(auth.agentId, auth.ownerId);
  return c.json({ data: conflicts });
});

// GET /:id — Get skill details
skillsRouter.get('/:id', requireScope('skills.read'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing skill id' }, 400);
  }
  const skill = await getSkill(id, auth.agentId, auth.ownerId);

  if (!skill) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  return c.json(skill);
});

// PATCH /:id — Update skill
skillsRouter.patch('/:id', requireScope('skills.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing skill id' }, 400);
  }
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = SkillUpdateSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const updated = await updateSkill(id, auth.agentId, auth.ownerId, parsed.data);

  if (!updated) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  return c.json(updated);
});

// DELETE /:id — Unregister (hard delete)
skillsRouter.delete('/:id', requireScope('skills.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing skill id' }, 400);
  }
  const deleted = await removeSkill(id, auth.agentId, auth.ownerId);

  if (!deleted) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  return c.json({ success: true });
});

// POST /:id/usage — Report usage
skillsRouter.post('/:id/usage', requireScope('skills.write'), async (c) => {
  const auth = c.get('auth' as never) as AgentAuthPayload;
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing skill id' }, 400);
  }
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = SkillUsageSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const updated = await reportUsage(id, auth.agentId, auth.ownerId, parsed.data.success);

  if (!updated) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  return c.json(updated);
});

export default skillsRouter;
