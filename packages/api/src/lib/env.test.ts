import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DEFAULT_DATABASE_URL, getDatabaseUrl, resolveLocalEnvPath } from './env.js';

test('getDatabaseUrl prefers DATABASE_URL from the environment', () => {
  assert.equal(
    getDatabaseUrl({ DATABASE_URL: 'postgresql://example.test/swarmrecall' }),
    'postgresql://example.test/swarmrecall',
  );
});

test('getDatabaseUrl falls back to the local Docker default', () => {
  assert.equal(getDatabaseUrl({}), DEFAULT_DATABASE_URL);
});

test('resolveLocalEnvPath climbs parent directories to find .env', (t) => {
  const rootDir = mkdtempSync(join(tmpdir(), 'swarmrecall-env-'));
  const nestedDir = join(rootDir, 'a', 'b', 'c');

  t.after(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  mkdirSync(nestedDir, { recursive: true });
  writeFileSync(join(rootDir, '.env'), 'DATABASE_URL=postgresql://example.test/swarmrecall\n');

  assert.equal(resolveLocalEnvPath([nestedDir]), join(rootDir, '.env'));
});
