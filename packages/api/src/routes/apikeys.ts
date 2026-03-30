import { Hono } from 'hono';
import { ApiKeyCreateSchema } from '@swarmrecall/shared';
import type { DashboardAuthPayload } from '../middleware/auth.js';
import { ApiKeyValidationError, createApiKey, listApiKeys, revokeApiKey } from '../services/apikeys.js';
import { logAuditEvent } from '../services/audit.js';

const apikeysRouter = new Hono();

// POST / — Create API key (returns full key once)
apikeysRouter.post('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const body = await c.req.json();
  const parsed = ApiKeyCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  let result;
  try {
    result = await createApiKey({
      ownerId: auth.ownerId,
      agentId: parsed.data.agentId,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });
  } catch (err) {
    if (err instanceof ApiKeyValidationError) {
      return c.json({ error: err.message }, err.status as 400 | 404);
    }
    throw err;
  }

  await logAuditEvent({
    eventType: 'apikey.created',
    actorId: auth.ownerId,
    targetId: result.id,
    targetType: 'api_key',
    ownerId: auth.ownerId,
    payload: { name: result.name, keyPrefix: result.keyPrefix },
  });

  return c.json(
    {
      id: result.id,
      name: result.name,
      key: result.rawKey,
      keyPrefix: result.keyPrefix,
      agentId: result.agentId,
      scopes: result.scopes,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
    },
    201,
  );
});

// GET / — List API keys (masked)
apikeysRouter.get('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const keys = await listApiKeys(auth.ownerId);
  return c.json({ data: keys });
});

// DELETE /:id — Revoke API key
apikeysRouter.delete('/:id', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const id = c.req.param('id');

  const revoked = await revokeApiKey(id, auth.ownerId);

  if (!revoked) {
    return c.json({ error: 'API key not found' }, 404);
  }

  await logAuditEvent({
    eventType: 'apikey.revoked',
    actorId: auth.ownerId,
    targetId: id,
    targetType: 'api_key',
    ownerId: auth.ownerId,
  });

  return c.json({ success: true });
});

export default apikeysRouter;
