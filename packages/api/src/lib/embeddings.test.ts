import assert from 'node:assert/strict';
import test from 'node:test';
import { runEmbeddingExtractor } from './embeddings.js';

test('runEmbeddingExtractor pads successful embeddings to 1536 dimensions', async () => {
  const vector = await runEmbeddingExtractor(
    async () => ({ data: Float32Array.from([0.25, 0.5, 0.75]) }),
    'search_document',
    'smoke',
  );

  assert.equal(vector.length, 1536);
  assert.deepEqual(vector.slice(0, 3), [0.25, 0.5, 0.75]);
  assert.equal(vector[1535], 0);
});

test('runEmbeddingExtractor returns an empty vector when extraction fails', async () => {
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
  const vector = await runEmbeddingExtractor(
    async () => {
      throw new Error('model unavailable');
    },
    'search_query',
    'smoke',
  );

  assert.deepEqual(vector, []);
  } finally {
    console.warn = originalWarn;
  }
});
