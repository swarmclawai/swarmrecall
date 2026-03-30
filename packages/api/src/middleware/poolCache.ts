import type { Context, Next } from 'hono';
import { poolCacheStorage } from '../services/poolAccess.js';

/**
 * Creates a fresh pool access cache per request using AsyncLocalStorage.
 * Service functions automatically use the cache — no parameter threading needed.
 */
export async function poolCacheMiddleware(c: Context, next: Next) {
  await poolCacheStorage.run(
    { readable: new Map(), writable: new Map() },
    () => next(),
  );
}
