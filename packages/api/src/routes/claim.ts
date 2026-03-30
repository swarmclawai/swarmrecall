import { Hono } from 'hono';
import { ClaimSchema } from '@swarmrecall/shared';
import { claimAgent, ClaimError } from '../services/registration.js';
import type { DashboardAuthPayload } from '../middleware/auth.js';

const claimRouter = new Hono();

// POST / — Claim an agent with a claim token (Firebase auth required)
claimRouter.post('/', async (c) => {
  const auth = c.get('auth' as never) as DashboardAuthPayload;
  const body = await c.req.json();
  const parsed = ClaimSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await claimAgent(parsed.data.claimToken, auth.firebaseUid);
    return c.json(result, 200);
  } catch (err) {
    if (err instanceof ClaimError) {
      return c.json({ error: err.message }, err.status as 404 | 409 | 410);
    }
    throw err;
  }
});

export default claimRouter;
