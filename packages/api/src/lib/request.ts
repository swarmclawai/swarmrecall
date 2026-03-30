import type { Context } from 'hono';

interface ParseJsonBodyOptions<T> {
  empty: T;
}

type ParseJsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseJsonBody<T = unknown>(
  c: Context,
  options?: ParseJsonBodyOptions<T>,
): Promise<ParseJsonBodyResult<T>> {
  const rawBody = await c.req.text();

  if (rawBody.trim() === '') {
    if (options) {
      return { ok: true, data: options.empty };
    }

    return {
      ok: false,
      response: c.json({ error: 'Invalid JSON' }, 400),
    };
  }

  try {
    return { ok: true, data: JSON.parse(rawBody) as T };
  } catch {
    return {
      ok: false,
      response: c.json({ error: 'Invalid JSON' }, 400),
    };
  }
}
