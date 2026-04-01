import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import health from './routes/health.js';
import memoryRouter from './routes/memory.js';
import knowledgeRouter from './routes/knowledge.js';
import learningsRouter from './routes/learnings.js';
import skillsRouter from './routes/skills.js';
import ownersRouter from './routes/owners.js';
import agentsRouter from './routes/agents.js';
import apikeysRouter from './routes/apikeys.js';
import registerRouter from './routes/register.js';
import claimRouter from './routes/claim.js';
import exportRouter from './routes/export.js';
import dreamRouter from './routes/dream.js';
import statsRouter from './routes/stats.js';
import poolsRouter from './routes/pools.js';
import agentPoolsRouter from './routes/agentPools.js';
import { apiKeyAuth, firebaseAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { poolCacheMiddleware } from './middleware/poolCache.js';
import { RATE_LIMIT_REGISTER } from '@swarmrecall/shared';
import { ensureIndexes } from './services/search.js';
import { startDreamScheduler } from './jobs/dreamScheduler.js';
import { connectRedis } from './lib/redis.js';
import { initEmbeddings } from './lib/embeddings.js';

export function createApp() {
  const app = new Hono();

  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3400').split(','),
    }),
  );

  // Health (no auth)
  app.route('/api/v1/health', health);

  // Self-registration (no auth, rate limited by IP)
  app.route('/api/v1/register', (() => { const r = new Hono(); r.use('*', rateLimit(60_000, RATE_LIMIT_REGISTER)); r.route('/', registerRouter); return r; })());

  // Claim (Firebase auth + rate limiting)
  app.route('/api/v1/claim', (() => { const r = new Hono(); r.use('*', firebaseAuth); r.use('*', rateLimit()); r.route('/', claimRouter); return r; })());

  // Agent routes (API key auth + rate limiting + pool cache)
  app.route('/api/v1/memory', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.use('*', poolCacheMiddleware); r.route('/', memoryRouter); return r; })());
  app.route('/api/v1/knowledge', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.use('*', poolCacheMiddleware); r.route('/', knowledgeRouter); return r; })());
  app.route('/api/v1/learnings', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.use('*', poolCacheMiddleware); r.route('/', learningsRouter); return r; })());
  app.route('/api/v1/skills', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.use('*', poolCacheMiddleware); r.route('/', skillsRouter); return r; })());
  app.route('/api/v1/export', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.route('/', exportRouter); return r; })());
  app.route('/api/v1/dream', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.use('*', poolCacheMiddleware); r.route('/', dreamRouter); return r; })());
  app.route('/api/v1/pools', (() => { const r = new Hono(); r.use('*', apiKeyAuth); r.use('*', rateLimit()); r.route('/', agentPoolsRouter); return r; })());

  // Dashboard routes (Firebase auth + rate limiting)
  app.route('/api/v1/owners', (() => { const r = new Hono(); r.use('*', firebaseAuth); r.use('*', rateLimit()); r.route('/', ownersRouter); return r; })());
  app.route('/api/v1/agents', (() => { const r = new Hono(); r.use('*', firebaseAuth); r.use('*', rateLimit()); r.route('/', agentsRouter); return r; })());
  app.route('/api/v1/api-keys', (() => { const r = new Hono(); r.use('*', firebaseAuth); r.use('*', rateLimit()); r.route('/', apikeysRouter); return r; })());
  app.route('/api/v1/stats', (() => { const r = new Hono(); r.use('*', firebaseAuth); r.use('*', rateLimit()); r.route('/', statsRouter); return r; })());
  app.route('/api/v1/manage/pools', (() => { const r = new Hono(); r.use('*', firebaseAuth); r.use('*', rateLimit()); r.route('/', poolsRouter); return r; })());

  // Global error handler
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error('Unhandled error:', err);
    return c.json(
      { error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message },
      500,
    );
  });

  return app;
}

const app = createApp();

// Startup
const port = Number(process.env.PORT ?? 3300);

async function start() {
  await connectRedis();
  await ensureIndexes();
  initEmbeddings().catch(() => console.warn('Embedding model load deferred'));
  startDreamScheduler();
  serve({ fetch: app.fetch, port });
  console.log(`SwarmRecall API running on port ${port}`);
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  start();
}

export default app;
