import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [];
  }

  const res = await openai.embeddings.create({
    model,
    input: text.slice(0, 8000),
    dimensions,
  });

  return res.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY || texts.length === 0) {
    return texts.map(() => []);
  }

  const res = await openai.embeddings.create({
    model,
    input: texts.map((t) => t.slice(0, 8000)),
    dimensions,
  });

  return res.data.map((d) => d.embedding);
}
