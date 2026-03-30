import { Hono } from 'hono';
import { RegisterSchema } from '@swarmrecall/shared';
import { parseJsonBody } from '../lib/request.js';
import { registerAgent } from '../services/registration.js';

const registerRouter = new Hono();

// POST / — Self-register an agent (no auth required)
registerRouter.post('/', async (c) => {
  const parsedBody = await parseJsonBody(c, { empty: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = RegisterSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await registerAgent(parsed.data.name);

  return c.json(result, 201);
});

export default registerRouter;
