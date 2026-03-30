const EMBEDDING_DIM = 1536;

let extractor: unknown = null;

export async function initEmbeddings(): Promise<void> {
  if (extractor) return;
  // Ensure HF cache dir is writable (Render containers may lack default cache)
  if (!process.env.HF_HOME) {
    process.env.HF_HOME = '/tmp/hf-cache';
  }
  console.log(`Loading embedding model (nomic-embed-text-v1.5), cache: ${process.env.HF_HOME}...`);
  const { pipeline, env } = await import('@huggingface/transformers');
  (env as Record<string, unknown>).cacheDir = process.env.HF_HOME;
  extractor = await (pipeline as Function)('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
    dtype: 'fp32',
    cache_dir: process.env.HF_HOME,
  });
  console.log('Embedding model loaded (768 native dims, padded to 1536).');
}

function padTo1536(arr: number[]): number[] {
  if (arr.length >= EMBEDDING_DIM) return arr.slice(0, EMBEDDING_DIM);
  const padded = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < arr.length; i++) padded[i] = arr[i];
  return padded;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!extractor) await initEmbeddings();
  const prefixed = `search_document: ${text}`;
  const output = await (extractor as Function)(prefixed, { pooling: 'mean', normalize: true });
  const data = (output as { data: Float32Array }).data;
  return padTo1536(Array.from(data));
}

export async function generateQueryEmbedding(text: string): Promise<number[]> {
  if (!extractor) await initEmbeddings();
  const prefixed = `search_query: ${text}`;
  const output = await (extractor as Function)(prefixed, { pooling: 'mean', normalize: true });
  const data = (output as { data: Float32Array }).data;
  return padTo1536(Array.from(data));
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => generateEmbedding(t)));
}
