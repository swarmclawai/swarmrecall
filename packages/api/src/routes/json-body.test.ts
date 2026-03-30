import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import agentsRouter from './agents.js';
import claimRouter from './claim.js';
import memoryRouter from './memory.js';

test('claim route returns 400 for malformed JSON', async () => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('auth' as never, {
      ownerId: 'owner-1',
      firebaseUid: 'firebase-1',
      email: 'owner@example.com',
    } as never);
    await next();
  });

  app.route('/', claimRouter);

  const response = await app.request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"claimToken"',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON' });
});

test('memory route returns 400 for malformed JSON', async () => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('auth' as never, {
      ownerId: 'owner-1',
      agentId: 'agent-1',
      scopes: ['memory.write'],
      keyId: 'key-1',
    } as never);
    await next();
  });

  app.route('/', memoryRouter);

  const response = await app.request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"content":"oops"',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON' });
});

test('agents route returns 400 for malformed JSON', async () => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.set('auth' as never, {
      ownerId: 'owner-1',
      firebaseUid: 'firebase-1',
      email: 'owner@example.com',
    } as never);
    await next();
  });

  app.route('/', agentsRouter);

  const response = await app.request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"broken"',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid JSON' });
});
