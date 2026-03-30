import { MeiliSearch } from 'meilisearch';

const meiliUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
const meiliKey = process.env.MEILISEARCH_API_KEY ?? 'localdev';

export const meili = new MeiliSearch({ host: meiliUrl, apiKey: meiliKey });

const INDEX_CONFIGS: Record<string, { filterableAttributes: string[]; searchableAttributes: string[] }> = {
  memories: {
    filterableAttributes: ['ownerId', 'agentId', 'poolId', 'category'],
    searchableAttributes: ['content', 'tags'],
  },
  entities: {
    filterableAttributes: ['ownerId', 'agentId', 'poolId', 'type'],
    searchableAttributes: ['name', 'type'],
  },
  learnings: {
    filterableAttributes: ['ownerId', 'agentId', 'poolId', 'category', 'status', 'priority', 'area'],
    searchableAttributes: ['summary', 'details', 'suggestedAction', 'tags'],
  },
  skills: {
    filterableAttributes: ['ownerId', 'agentId', 'poolId', 'status'],
    searchableAttributes: ['name', 'description', 'source'],
  },
};

let initialized = false;

export async function ensureIndexes() {
  if (initialized) return;
  try {
    for (const [name, config] of Object.entries(INDEX_CONFIGS)) {
      const idx = meili.index(name);
      await idx.updateFilterableAttributes(config.filterableAttributes);
      await idx.updateSearchableAttributes(config.searchableAttributes);
    }
    initialized = true;
    console.log('Meilisearch indexes configured');
  } catch (err) {
    console.warn('Meilisearch unavailable:', (err as Error).message);
  }
}

export async function indexDocument(indexName: string, doc: Record<string, unknown>) {
  try {
    await meili.index(indexName).addDocuments([doc]);
  } catch {
    // Meilisearch may be unavailable in dev
  }
}

export async function removeDocument(indexName: string, id: string) {
  try {
    await meili.index(indexName).deleteDocument(id);
  } catch {
    // noop
  }
}

export async function searchDocuments(
  indexName: string,
  query: string,
  filter: string,
  limit = 20,
) {
  try {
    return await meili.index(indexName).search(query, {
      filter,
      limit,
      showRankingScore: true,
    });
  } catch {
    return { hits: [], estimatedTotalHits: 0 };
  }
}

export const searchIndex = {
  indexDocument,
  removeDocument,
  searchDocuments,
};
