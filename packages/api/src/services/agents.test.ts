import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildArchiveOwnedAgentQuery,
  buildGetOwnedActiveAgentQuery,
  buildListOwnedActiveAgentsQuery,
} from './agents.js';

test('active agent list query excludes archived agents', () => {
  const sql = buildListOwnedActiveAgentsQuery('owner-1').toSQL();

  assert.match(sql.sql, /"agents"\."archived_at" is null/);
  assert.deepEqual(sql.params, ['owner-1']);
});

test('active agent detail query excludes archived agents', () => {
  const sql = buildGetOwnedActiveAgentQuery('agent-1', 'owner-1').toSQL();

  assert.match(sql.sql, /"agents"\."id" = \$1/);
  assert.match(sql.sql, /"agents"\."owner_id" = \$2/);
  assert.match(sql.sql, /"agents"\."archived_at" is null/);
  assert.deepEqual(sql.params, ['agent-1', 'owner-1', 1]);
});

test('archive agent query marks the agent deleted and archived', () => {
  const now = new Date('2026-03-30T12:00:00.000Z');
  const sql = buildArchiveOwnedAgentQuery('agent-1', 'owner-1', now).toSQL();

  assert.match(sql.sql, /update "agents" set "status" = \$1, "archived_at" = \$2, "updated_at" = \$3/);
  assert.match(sql.sql, /"agents"\."archived_at" is null/);
  assert.deepEqual(sql.params, [
    'deleted',
    '2026-03-30T12:00:00.000Z',
    '2026-03-30T12:00:00.000Z',
    'agent-1',
    'owner-1',
  ]);
});
