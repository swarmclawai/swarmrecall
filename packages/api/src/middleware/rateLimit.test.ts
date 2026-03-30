import assert from 'node:assert/strict';
import test from 'node:test';
import { getRateLimitIdentifier } from './rateLimit.js';

test('getRateLimitIdentifier prefers the API key id when available', () => {
  const identifier = getRateLimitIdentifier({
    get(key: string) {
      if (key === 'auth') {
        return { keyId: 'key-123', ownerId: 'owner-123' };
      }
      return undefined;
    },
    req: {
      header(name?: string) {
        if (name === undefined) {
          return {};
        }
        if (name === 'x-forwarded-for') {
          return '203.0.113.10, 198.51.100.8';
        }
        return undefined;
      },
    },
  } as never);

  assert.equal(identifier, 'key-123');
});

test('getRateLimitIdentifier falls back to the forwarded IP and trims proxies', () => {
  const identifier = getRateLimitIdentifier({
    get() {
      return undefined;
    },
    req: {
      header(name?: string) {
        if (name === undefined) {
          return {};
        }
        if (name === 'x-forwarded-for') {
          return '203.0.113.10, 198.51.100.8';
        }
        return undefined;
      },
    },
  } as never);

  assert.equal(identifier, '203.0.113.10');
});
