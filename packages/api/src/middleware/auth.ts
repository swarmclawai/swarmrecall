import type { Context, Next } from 'hono';
import { createHash } from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { owners, apiKeys } from '../db/schema.js';
import { verifyIdToken } from '../lib/firebase.js';
import { redis } from '../lib/redis.js';
import { API_KEY_PREFIX } from '@swarmrecall/shared';
import type { ApiKeyScope } from '@swarmrecall/shared';

// --- Types set on Hono context ---

export interface AgentAuthPayload {
  ownerId: string;
  agentId: string;
  scopes: string[];
  keyId: string;
}

export interface DashboardAuthPayload {
  ownerId: string;
  firebaseUid: string;
  email: string | null;
}

// --- API Key Auth (for agent routes) ---

export async function apiKeyAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const token = authHeader.slice(7);
  if (!token.startsWith(API_KEY_PREFIX)) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  const keyHash = createHash('sha256').update(token).digest('hex');

  // Check Redis cache first
  const cacheKey = `apikey:${keyHash}`;
  let cached: string | null = null;
  try {
    cached = await redis.get(cacheKey);
  } catch {
    // Redis may be unavailable
  }

  let keyData: { id: string; ownerId: string; agentId: string | null; scopes: string[] } | null = null;

  if (cached) {
    keyData = JSON.parse(cached);
  } else {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
      .limit(1);

    if (!row) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    if (row.expiresAt && row.expiresAt < new Date()) {
      return c.json({ error: 'API key expired' }, 401);
    }

    keyData = { id: row.id, ownerId: row.ownerId, agentId: row.agentId, scopes: row.scopes };

    // Cache for 60 seconds
    try {
      await redis.setex(cacheKey, 60, JSON.stringify(keyData));
    } catch {
      // noop
    }
  }

  if (!keyData?.agentId) {
    return c.json({ error: 'API key must be scoped to an agent' }, 403);
  }

  c.set('auth', {
    ownerId: keyData.ownerId,
    agentId: keyData.agentId,
    scopes: keyData.scopes,
    keyId: keyData.id,
  } satisfies AgentAuthPayload);

  // Touch lastUsedAt async (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyData.id))
    .then(() => {})
    .catch(() => {});

  await next();
}

// --- Firebase Auth (for dashboard routes) ---

export async function firebaseAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing auth token' }, 401);
  }

  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    return c.json({ error: 'Invalid auth token' }, 401);
  }

  // Upsert owner
  const [existing] = await db
    .select()
    .from(owners)
    .where(eq(owners.firebaseUid, decoded.uid))
    .limit(1);

  let ownerId: string;

  if (existing) {
    ownerId = existing.id;
    // Update email/name if changed
    if (existing.email !== (decoded.email ?? null) || existing.displayName !== (decoded.name ?? null)) {
      await db
        .update(owners)
        .set({
          email: decoded.email ?? null,
          displayName: decoded.name ?? null,
          avatarUrl: decoded.picture ?? null,
          updatedAt: new Date(),
        })
        .where(eq(owners.id, existing.id));
    }
  } else {
    const [newOwner] = await db
      .insert(owners)
      .values({
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      })
      .returning();
    ownerId = newOwner.id;
  }

  c.set('auth', {
    ownerId,
    firebaseUid: decoded.uid,
    email: decoded.email ?? null,
  } satisfies DashboardAuthPayload);

  await next();
}

// --- Scope check ---

export function requireScope(...requiredScopes: ApiKeyScope[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AgentAuthPayload;
    const hasAll = requiredScopes.every((s) => auth.scopes.includes(s));
    if (!hasAll) {
      return c.json({ error: `Missing required scope(s): ${requiredScopes.join(', ')}` }, 403);
    }
    await next();
  };
}
