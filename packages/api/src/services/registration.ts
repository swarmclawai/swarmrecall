import { randomBytes } from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  owners, agents, apiKeys, claimTokens,
  memories, memorySessions, entities, relations, entityTypes,
  learnings, learningPatterns, agentSkills, skillOverrides,
} from '../db/schema.js';
import { redisDel } from '../lib/redis.js';
import { createApiKey } from './apikeys.js';
import { logAuditEvent } from './audit.js';
import {
  CLAIM_TOKEN_PREFIX, CLAIM_TOKEN_EXPIRY_DAYS, API_KEY_SCOPES,
} from '@swarmrecall/shared';

// --- Token generation ---

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I for readability

function randomAlphanumeric(length: number): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return result;
}

export function generateClaimToken(): string {
  return `${CLAIM_TOKEN_PREFIX}-${randomAlphanumeric(4)}-${randomAlphanumeric(4)}`;
}

// --- Self-registration ---

export async function registerAgent(name?: string) {
  // 1. Create unclaimed owner (no firebaseUid)
  const [owner] = await db
    .insert(owners)
    .values({
      claimed: 'false',
    })
    .returning();

  // 2. Create agent
  const agentName = name ?? `agent-${owner.id.slice(0, 8)}`;
  const [agent] = await db
    .insert(agents)
    .values({
      ownerId: owner.id,
      name: agentName,
    })
    .returning();

  // 3. Create API key with all scopes
  const { rawKey } = await createApiKey({
    ownerId: owner.id,
    agentId: agent.id,
    name: `${agentName}-default`,
    scopes: [...API_KEY_SCOPES],
  });

  // 4. Create claim token
  const token = generateClaimToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CLAIM_TOKEN_EXPIRY_DAYS);

  await db.insert(claimTokens).values({
    token,
    ownerId: owner.id,
    agentId: agent.id,
    expiresAt,
  });

  // 5. Audit
  await logAuditEvent({
    eventType: 'agent.self_registered',
    actorId: owner.id,
    targetId: agent.id,
    targetType: 'agent',
    ownerId: owner.id,
    payload: { agentName, claimToken: token },
  });

  const baseUrl = process.env.DASHBOARD_URL ?? 'https://app.swarmrecall.com';

  return {
    apiKey: rawKey,
    agentId: agent.id,
    ownerId: owner.id,
    claimToken: token,
    claimUrl: `${baseUrl}/claim?token=${token}`,
  };
}

// --- Claim ---

export async function claimAgent(claimToken: string, firebaseOwnerId: string) {
  // 1. Look up claim token
  const [tokenRecord] = await db
    .select()
    .from(claimTokens)
    .where(eq(claimTokens.token, claimToken))
    .limit(1);

  if (!tokenRecord) {
    throw new ClaimError('Invalid claim token', 404);
  }

  // 2. Verify not expired
  if (tokenRecord.expiresAt < new Date()) {
    throw new ClaimError('Claim token has expired', 410);
  }

  // 3. Verify not already claimed
  if (tokenRecord.claimedAt) {
    throw new ClaimError('Claim token has already been used', 409);
  }

  const oldOwnerId = tokenRecord.ownerId;
  const agentId = tokenRecord.agentId;

  // 4. Find or create the Firebase-authenticated owner
  const [existingOwner] = await db
    .select()
    .from(owners)
    .where(eq(owners.firebaseUid, firebaseOwnerId))
    .limit(1);

  let newOwnerId: string;

  if (existingOwner) {
    newOwnerId = existingOwner.id;
  } else {
    const [newOwner] = await db
      .insert(owners)
      .values({
        firebaseUid: firebaseOwnerId,
        claimed: 'true',
      })
      .returning();
    newOwnerId = newOwner.id;
  }

  const now = new Date();
  const { agentName, transferredKeyHashes } = await db.transaction(async (tx) => {
    const [updatedAgent] = await tx
      .update(agents)
      .set({ ownerId: newOwnerId, updatedAt: now })
      .where(and(eq(agents.id, agentId), eq(agents.ownerId, oldOwnerId)))
      .returning({ name: agents.name });

    if (!updatedAgent) {
      throw new ClaimError('Agent not found', 404);
    }

    const transferredKeys = await tx
      .update(apiKeys)
      .set({ ownerId: newOwnerId })
      .where(and(eq(apiKeys.ownerId, oldOwnerId), eq(apiKeys.agentId, agentId)))
      .returning({ keyHash: apiKeys.keyHash });

    await tx
      .update(memories)
      .set({ ownerId: newOwnerId, updatedAt: now })
      .where(and(eq(memories.ownerId, oldOwnerId), eq(memories.agentId, agentId)));

    await tx
      .update(memorySessions)
      .set({ ownerId: newOwnerId })
      .where(and(eq(memorySessions.ownerId, oldOwnerId), eq(memorySessions.agentId, agentId)));

    await tx
      .update(entities)
      .set({ ownerId: newOwnerId, updatedAt: now })
      .where(and(eq(entities.ownerId, oldOwnerId), eq(entities.agentId, agentId)));

    await tx
      .update(relations)
      .set({ ownerId: newOwnerId })
      .where(and(eq(relations.ownerId, oldOwnerId), eq(relations.agentId, agentId)));

    await tx
      .update(learnings)
      .set({ ownerId: newOwnerId, updatedAt: now })
      .where(and(eq(learnings.ownerId, oldOwnerId), eq(learnings.agentId, agentId)));

    await tx
      .update(learningPatterns)
      .set({ ownerId: newOwnerId })
      .where(and(eq(learningPatterns.ownerId, oldOwnerId), eq(learningPatterns.agentId, agentId)));

    await tx
      .update(agentSkills)
      .set({ ownerId: newOwnerId, updatedAt: now })
      .where(and(eq(agentSkills.ownerId, oldOwnerId), eq(agentSkills.agentId, agentId)));

    await tx
      .update(claimTokens)
      .set({
        claimedBy: newOwnerId,
        claimedAt: now,
      })
      .where(eq(claimTokens.id, tokenRecord.id));

    const [{ count: remainingAgents }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(eq(agents.ownerId, oldOwnerId));

    if (remainingAgents === 0) {
      await tx
        .update(entityTypes)
        .set({ ownerId: newOwnerId, updatedAt: now })
        .where(eq(entityTypes.ownerId, oldOwnerId));

      await tx
        .update(owners)
        .set({
          claimed: 'merged',
          updatedAt: now,
        })
        .where(eq(owners.id, oldOwnerId));
    }

    return {
      agentName: updatedAgent.name,
      transferredKeyHashes: transferredKeys.map((key) => key.keyHash),
    };
  });

  for (const keyHash of transferredKeyHashes) {
    redisDel(`apikey:${keyHash}`);
  }

  // Audit
  await logAuditEvent({
    eventType: 'agent.claimed',
    actorId: newOwnerId,
    targetId: agentId,
    targetType: 'agent',
    ownerId: newOwnerId,
    payload: { claimToken, oldOwnerId },
  });

  return {
    ownerId: newOwnerId,
    agentId,
    agentName,
  };
}

// --- Error class ---

export class ClaimError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClaimError';
    this.status = status;
  }
}
