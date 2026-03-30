import { randomBytes, createHash } from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { apiKeys } from '../db/schema.js';
import { API_KEY_PREFIX } from '@swarmrecall/shared';

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(20).toString('hex');
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(params: {
  ownerId: string;
  agentId?: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
}) {
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, API_KEY_PREFIX.length + 8);

  const [row] = await db
    .insert(apiKeys)
    .values({
      ownerId: params.ownerId,
      agentId: params.agentId ?? null,
      name: params.name,
      keyPrefix,
      keyHash,
      scopes: params.scopes,
      expiresAt: params.expiresAt ?? null,
    })
    .returning();

  return { ...row, rawKey };
}

export async function lookupApiKey(keyHash: string) {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function revokeApiKey(id: string, ownerId: string) {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.ownerId, ownerId)))
    .returning();

  return row ?? null;
}

export async function listApiKeys(ownerId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      agentId: apiKeys.agentId,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.ownerId, ownerId));
}

export async function touchApiKey(id: string) {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
