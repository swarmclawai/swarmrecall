import assert from 'node:assert/strict';
import test from 'node:test';
import { syncEntitySearchDocument } from './knowledge.js';
import { syncLearningSearchDocument } from './learnings.js';
import { syncMemorySearchDocument } from './memory.js';
import { searchIndex } from './search.js';

test('syncMemorySearchDocument indexes active memories and removes archived ones', async () => {
  const calls: Array<{ fn: 'index' | 'remove'; args: unknown[] }> = [];
  const originalIndex = searchIndex.indexDocument;
  const originalRemove = searchIndex.removeDocument;

  searchIndex.indexDocument = async (...args) => {
    calls.push({ fn: 'index', args });
  };
  searchIndex.removeDocument = async (...args) => {
    calls.push({ fn: 'remove', args });
  };

  try {
    await syncMemorySearchDocument({
      id: 'mem-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      content: 'hello world',
      category: 'fact',
      tags: ['tag-1'],
      poolId: null,
      archivedAt: null,
    });

    await syncMemorySearchDocument({
      id: 'mem-2',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      content: 'archived',
      category: 'fact',
      tags: [],
      poolId: null,
      archivedAt: new Date('2026-03-30T12:00:00.000Z'),
    });
  } finally {
    searchIndex.indexDocument = originalIndex;
    searchIndex.removeDocument = originalRemove;
  }

  assert.deepEqual(calls, [
    {
      fn: 'index',
      args: [
        'memories',
        {
          id: 'mem-1',
          ownerId: 'owner-1',
          agentId: 'agent-1',
          poolId: null,
          content: 'hello world',
          category: 'fact',
          tags: ['tag-1'],
        },
      ],
    },
    {
      fn: 'remove',
      args: ['memories', 'mem-2'],
    },
  ]);
});

test('syncEntitySearchDocument indexes active entities', async () => {
  const calls: Array<{ fn: 'index' | 'remove'; args: unknown[] }> = [];
  const originalIndex = searchIndex.indexDocument;
  const originalRemove = searchIndex.removeDocument;

  searchIndex.indexDocument = async (...args) => {
    calls.push({ fn: 'index', args });
  };
  searchIndex.removeDocument = async (...args) => {
    calls.push({ fn: 'remove', args });
  };

  try {
    await syncEntitySearchDocument({
      id: 'ent-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      name: 'Alice',
      type: 'Person',
      poolId: null,
      archivedAt: null,
    });
  } finally {
    searchIndex.indexDocument = originalIndex;
    searchIndex.removeDocument = originalRemove;
  }

  assert.deepEqual(calls, [
    {
      fn: 'index',
      args: [
        'entities',
        {
          id: 'ent-1',
          ownerId: 'owner-1',
          agentId: 'agent-1',
          poolId: null,
          name: 'Alice',
          type: 'Person',
        },
      ],
    },
  ]);
});

test('syncLearningSearchDocument indexes active learnings', async () => {
  const calls: Array<{ fn: 'index' | 'remove'; args: unknown[] }> = [];
  const originalIndex = searchIndex.indexDocument;
  const originalRemove = searchIndex.removeDocument;

  searchIndex.indexDocument = async (...args) => {
    calls.push({ fn: 'index', args });
  };
  searchIndex.removeDocument = async (...args) => {
    calls.push({ fn: 'remove', args });
  };

  try {
    await syncLearningSearchDocument({
      id: 'lrn-1',
      ownerId: 'owner-1',
      agentId: 'agent-1',
      category: 'best_practice',
      summary: 'Prefer tenant scoping',
      details: 'Always include owner filters',
      status: 'resolved',
      priority: 'high',
      area: 'backend',
      suggestedAction: 'Add tests',
      tags: ['tenant'],
      poolId: null,
      archivedAt: null,
    });
  } finally {
    searchIndex.indexDocument = originalIndex;
    searchIndex.removeDocument = originalRemove;
  }

  assert.deepEqual(calls, [
    {
      fn: 'index',
      args: [
        'learnings',
        {
          id: 'lrn-1',
          agentId: 'agent-1',
          ownerId: 'owner-1',
          poolId: null,
          category: 'best_practice',
          summary: 'Prefer tenant scoping',
          details: 'Always include owner filters',
          status: 'resolved',
          priority: 'high',
          area: 'backend',
          suggestedAction: 'Add tests',
          tags: ['tenant'],
        },
      ],
    },
  ]);
});
