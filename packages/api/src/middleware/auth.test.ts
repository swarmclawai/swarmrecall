import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import { parseCachedApiKeyData, requireScope } from './auth.js';

test('parseCachedApiKeyData accepts Redis object responses', () => {
  assert.deepEqual(
    parseCachedApiKeyData({
      id: 'key-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      scopes: ['memory.read'],
    }),
    {
      id: 'key-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      scopes: ['memory.read'],
    },
  );
});

test('parseCachedApiKeyData accepts JSON string responses', () => {
  assert.deepEqual(
    parseCachedApiKeyData('{"id":"key-1","ownerId":"owner-1","agentId":"agent-1","scopes":["memory.read"]}'),
    {
      id: 'key-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      scopes: ['memory.read'],
    },
  );
});

test('requireScope allows requests with the required scope', async () => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('auth' as never, {
      ownerId: 'owner-1',
      agentId: 'agent-1',
      scopes: ['memory.read'],
      keyId: 'key-1',
    } as never);
    await next();
  });

  app.get('/memory', requireScope('memory.read'), (c) => c.json({ ok: true }));

  const response = await app.request('http://localhost/memory');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test('requireScope rejects requests without the required scope', async () => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('auth' as never, {
      ownerId: 'owner-1',
      agentId: 'agent-1',
      scopes: ['memory.read'],
      keyId: 'key-1',
    } as never);
    await next();
  });

  app.post('/memory', requireScope('memory.write'), (c) => c.json({ ok: true }));

  const response = await app.request('http://localhost/memory', { method: 'POST' });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: 'Missing required scope(s): memory.write',
  });
});
