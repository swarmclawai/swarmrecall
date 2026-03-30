import { Hono } from 'hono';
import { RegisterSchema } from '@swarmrecall/shared';
import { registerAgent } from '../services/registration.js';

const registerRouter = new Hono();

// POST / — Self-register an agent (no auth required)
registerRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await registerAgent(parsed.data.name);

  return c.json(result, 201);
});

export default registerRouter;
