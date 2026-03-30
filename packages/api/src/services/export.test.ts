import assert from 'node:assert/strict';
import test from 'node:test';
import { getUnauthorizedExportModules, parseExportModules } from './export.js';

test('parseExportModules defaults to all modules when omitted', () => {
  assert.deepEqual(parseExportModules(undefined), ['memory', 'knowledge', 'learnings', 'skills']);
});

test('parseExportModules rejects unknown module names', () => {
  assert.equal(parseExportModules('memory,unknown'), null);
});

test('getUnauthorizedExportModules maps modules to their required read scopes', () => {
  const unauthorized = getUnauthorizedExportModules(['memory.read', 'skills.read'], ['memory', 'knowledge', 'skills']);

  assert.deepEqual(unauthorized, ['knowledge']);
});

