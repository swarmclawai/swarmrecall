import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

export async function connectRedis() {
  const client = getRedis();
  if (!client) {
    console.warn('Redis unavailable — no UPSTASH_REDIS_REST_URL/TOKEN configured');
    return;
  }
  try {
    await client.ping();
    console.log('Redis connected (Upstash)');
  } catch (err) {
    console.warn('Redis unavailable:', (err as Error).message);
    redis = null;
  }
}

export async function redisGet(key: string): Promise<unknown | null> {
  try {
    return await getRedis()?.get(key) ?? null;
  } catch {
    return null;
  }
}

export async function redisSetex(key: string, seconds: number, value: string): Promise<void> {
  try {
    await getRedis()?.setex(key, seconds, value);
  } catch {
    // noop
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  try {
    return await getRedis()?.incr(key) ?? null;
  } catch {
    return null;
  }
}

export async function redisPexpire(key: string, milliseconds: number): Promise<void> {
  try {
    await getRedis()?.pexpire(key, milliseconds);
  } catch {
    // noop
  }
}

export async function redisDel(key: string): Promise<void> {
  try {
    await getRedis()?.del(key);
  } catch {
    // noop
  }
}
