import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
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
import { apiKeyAuth, firebaseAuth } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { RATE_LIMIT_REGISTER } from '@swarmrecall/shared';
import { ensureIndexes } from './services/search.js';
import { connectRedis } from './lib/redis.js';
import { initEmbeddings } from './lib/embeddings.js';

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
app.route('/api/v1/claim', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', firebaseAuth); r.route('/', claimRouter); return r; })());

// Agent routes (API key auth + rate limiting)
const agentApi = new Hono();
agentApi.use('*', rateLimit());
agentApi.use('*', apiKeyAuth);

app.route('/api/v1/memory', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', apiKeyAuth); r.route('/', memoryRouter); return r; })());
app.route('/api/v1/knowledge', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', apiKeyAuth); r.route('/', knowledgeRouter); return r; })());
app.route('/api/v1/learnings', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', apiKeyAuth); r.route('/', learningsRouter); return r; })());
app.route('/api/v1/skills', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', apiKeyAuth); r.route('/', skillsRouter); return r; })());
app.route('/api/v1/export', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', apiKeyAuth); r.route('/', exportRouter); return r; })());

// Dashboard routes (Firebase auth + rate limiting)
app.route('/api/v1/owners', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', firebaseAuth); r.route('/', ownersRouter); return r; })());
app.route('/api/v1/agents', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', firebaseAuth); r.route('/', agentsRouter); return r; })());
app.route('/api/v1/api-keys', (() => { const r = new Hono(); r.use('*', rateLimit()); r.use('*', firebaseAuth); r.route('/', apikeysRouter); return r; })());

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message },
    500,
  );
});

// Startup
const port = Number(process.env.PORT ?? 3300);

async function start() {
  await connectRedis();
  await ensureIndexes();
  initEmbeddings().catch(() => console.warn('Embedding model load deferred'));
  serve({ fetch: app.fetch, port });
  console.log(`SwarmRecall API running on port ${port}`);
}

start();

export default app;
