import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { owners } from '../db/schema.js';
import { parseJsonBody } from '../lib/request.js';
import type { DashboardAuthPayload } from '../middleware/auth.js';

const OwnerUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
});

const ownersRouter = new Hono();

// GET /me — Get current owner profile
ownersRouter.get('/me', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;

  const [owner] = await db
    .select({
      id: owners.id,
      firebaseUid: owners.firebaseUid,
      email: owners.email,
      displayName: owners.displayName,
      avatarUrl: owners.avatarUrl,
      plan: owners.plan,
      createdAt: owners.createdAt,
      updatedAt: owners.updatedAt,
    })
    .from(owners)
    .where(eq(owners.id, auth.ownerId))
    .limit(1);

  if (!owner) {
    return c.json({ error: 'Owner not found' }, 404);
  }

  return c.json(owner);
});

// PATCH /me — Update owner profile
ownersRouter.patch('/me', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const parsedBody = await parseJsonBody(c);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = OwnerUpdateSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const [updated] = await db
    .update(owners)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(owners.id, auth.ownerId))
    .returning({
      id: owners.id,
      firebaseUid: owners.firebaseUid,
      email: owners.email,
      displayName: owners.displayName,
      avatarUrl: owners.avatarUrl,
      plan: owners.plan,
      createdAt: owners.createdAt,
      updatedAt: owners.updatedAt,
    });

  if (!updated) {
    return c.json({ error: 'Owner not found' }, 404);
  }

  return c.json(updated);
});

export default ownersRouter;
