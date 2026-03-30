import { db } from '../db/client.js';
import { auditLog } from '../db/schema.js';

export async function logAuditEvent(params: {
  eventType: string;
  actorId?: string;
  targetId?: string;
  targetType?: string;
  ownerId: string;
  payload?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    eventType: params.eventType,
    actorId: params.actorId ?? null,
    targetId: params.targetId ?? null,
    targetType: params.targetType ?? null,
    ownerId: params.ownerId,
    payload: params.payload ?? null,
  });
}
