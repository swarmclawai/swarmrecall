import type { Context, Next } from 'hono';
import { redisIncr, redisPexpire } from '../lib/redis.js';
import { RATE_LIMIT_DEFAULT, RATE_LIMIT_SEARCH } from '@swarmrecall/shared';

// In-memory fallback when Redis is unavailable
const inMemory = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemory) {
    if (entry.resetAt < now) inMemory.delete(key);
  }
}, 60_000).unref();

export function getRateLimitIdentifier(c: Pick<Context, 'get' | 'req'>) {
  const auth = c.get('auth') as { keyId?: string; ownerId: string } | undefined;
  const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return auth?.keyId ?? auth?.ownerId ?? forwardedFor ?? 'anon';
}

export function rateLimit(windowMs = 60_000, maxRequests?: number) {
  return async (c: Context, next: Next) => {
    const limit = maxRequests ?? (c.req.path.includes('/search') ? RATE_LIMIT_SEARCH : RATE_LIMIT_DEFAULT);
    const identifier = getRateLimitIdentifier(c);
    const key = `rl:${identifier}`;

    const current = await redisIncr(key);

    if (current !== null) {
      if (current === 1) {
        redisPexpire(key, windowMs);
      }

      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', String(Math.max(0, limit - current)));

      if (current > limit) {
        return c.json({ error: 'Rate limit exceeded' }, 429);
      }
    } else {
      // Fallback to in-memory
      const now = Date.now();
      const entry = inMemory.get(key);

      if (!entry || entry.resetAt < now) {
        inMemory.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
        if (entry.count > limit) {
          return c.json({ error: 'Rate limit exceeded' }, 429);
        }
      }
    }

    await next();
  };
}
