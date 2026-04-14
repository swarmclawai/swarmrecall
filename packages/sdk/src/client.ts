import { SwarmRecallError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError, RateLimitError } from './errors.js';
import type {
  AgentSkill,
  DreamCycle,
  DreamConfig,
  DreamResults,
  Entity,
  Learning,
  LearningPattern,
  Memory,
  MemorySession,
  PaginatedResponse,
  Pool,
  PoolAccessLevel,
  PoolMember,
  RegisterResponse as SharedRegisterResponse,
  Relation,
  SearchResult,
} from '@swarmrecall/shared';

export interface SwarmRecallClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface RegisterOptions {
  name?: string;
  baseUrl?: string;
}

export type RegisterResponse = SharedRegisterResponse;

export interface RelationWithPoolName extends Relation {
  poolName: string | null;
}

export interface EntityDetail extends Entity {
  relations: RelationWithPoolName[];
}

export interface TraversedEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  depth: number;
}

export interface TraversedRelation {
  id: string;
  relation: string;
  fromEntityId: string;
  toEntityId: string;
}

export interface TraversalResult {
  entities: TraversedEntity[];
  relations: TraversedRelation[];
}

export interface ConstraintValidationResult {
  valid: boolean;
  errors: Array<{
    entityId: string;
    entityName: string;
    entityType: string;
    message: string;
  }>;
}

export interface AgentPoolSummary extends Pool {
  memoryAccess: PoolAccessLevel;
  knowledgeAccess: PoolAccessLevel;
  learningsAccess: PoolAccessLevel;
  skillsAccess: PoolAccessLevel;
  joinedAt: string;
}

export interface PoolDetail extends Pool {
  members: Array<PoolMember & { agentName: string }>;
}

export interface SuggestedSkill {
  id: string;
  name: string;
  description?: string | null;
  source?: string | null;
  status?: string | null;
  poolId?: string | null;
}

export class SwarmRecallClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  readonly memory: MemoryOperations;
  readonly knowledge: KnowledgeOperations;
  readonly learnings: LearningsOperations;
  readonly skills: SkillsOperations;
  readonly pools: PoolOperations;
  readonly dream: DreamOperations;

  constructor(options: SwarmRecallClientOptions) {
    this.baseUrl = (options.baseUrl ?? 'https://swarmrecall-api.onrender.com').replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.memory = new MemoryOperations(this);
    this.knowledge = new KnowledgeOperations(this);
    this.learnings = new LearningsOperations(this);
    this.skills = new SkillsOperations(this);
    this.pools = new PoolOperations(this);
    this.dream = new DreamOperations(this);
  }

  /**
   * Register a new agent and receive an API key. No account required.
   * The returned claimToken can be used at swarmrecall.ai/claim to link
   * the agent to a user account.
   */
  static async register(options?: RegisterOptions): Promise<RegisterResponse> {
    const url = (options?.baseUrl ?? 'https://swarmrecall-api.onrender.com').replace(/\/+$/, '');
    const res = await fetch(`${url}/api/v1/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: options?.name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      const msg = (data as { error?: string }).error ?? `Registration failed (HTTP ${res.status})`;
      throw new SwarmRecallError(msg, res.status);
    }
    return res.json() as Promise<RegisterResponse>;
  }

  /** @internal */
  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}/api/v1${path}`;
    if (query) {
      const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined));
      if (params.toString()) url += `?${params}`;
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
      switch (res.status) {
        case 400: throw new ValidationError(msg);
        case 401: throw new AuthenticationError(msg);
        case 403: throw new AuthorizationError(msg);
        case 404: throw new NotFoundError(msg);
        case 429: throw new RateLimitError(msg);
        default: throw new SwarmRecallError(msg, res.status);
      }
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

// --- Memory ---

class SessionOperations {
  constructor(private client: SwarmRecallClient) {}

  start(params?: { context?: Record<string, unknown>; poolId?: string }): Promise<MemorySession> {
    return this.client.request<MemorySession>('POST', '/memory/sessions', params);
  }

  current(): Promise<MemorySession> {
    return this.client.request<MemorySession>('GET', '/memory/sessions/current');
  }

  update(
    id: string,
    params: { currentState?: Record<string, unknown>; summary?: string; ended?: boolean },
  ): Promise<MemorySession> {
    return this.client.request<MemorySession>('PATCH', `/memory/sessions/${id}`, params);
  }

  list(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<MemorySession>> {
    return this.client.request<PaginatedResponse<MemorySession>>(
      'GET',
      '/memory/sessions',
      undefined,
      params as Record<string, string>,
    );
  }
}

class MemoryOperations {
  readonly sessions: SessionOperations;

  constructor(private client: SwarmRecallClient) {
    this.sessions = new SessionOperations(client);
  }

  store(params: { content: string; category: string; importance?: number; tags?: string[]; metadata?: Record<string, unknown>; sessionId?: string; poolId?: string }): Promise<Memory> {
    return this.client.request<Memory>('POST', '/memory', params);
  }

  search(query: string, options?: { limit?: number; minScore?: number }): Promise<{ data: SearchResult<Memory>[] }> {
    return this.client.request<{ data: SearchResult<Memory>[] }>('GET', '/memory/search', undefined, {
      q: query,
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.minScore ? { minScore: String(options.minScore) } : {}),
    });
  }

  get(id: string): Promise<Memory> {
    return this.client.request<Memory>('GET', `/memory/${id}`);
  }

  list(params?: { category?: string; sessionId?: string; limit?: number; offset?: number; includeArchived?: boolean }): Promise<PaginatedResponse<Memory>> {
    const q: Record<string, string> = {};
    if (params?.category) q.category = params.category;
    if (params?.sessionId) q.sessionId = params.sessionId;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    if (params?.includeArchived) q.includeArchived = 'true';
    return this.client.request<PaginatedResponse<Memory>>('GET', '/memory', undefined, q);
  }

  update(id: string, params: { importance?: number; tags?: string[]; metadata?: Record<string, unknown>; archived?: boolean }): Promise<Memory> {
    return this.client.request<Memory>('PATCH', `/memory/${id}`, params);
  }

  delete(id: string): Promise<{ message: string }> {
    return this.client.request<{ message: string }>('DELETE', `/memory/${id}`);
  }
}

// --- Knowledge ---

class EntityOperations {
  constructor(private client: SwarmRecallClient) {}

  create(params: { type: string; name: string; properties?: Record<string, unknown>; poolId?: string }): Promise<Entity> {
    return this.client.request<Entity>('POST', '/knowledge/entities', params);
  }

  get(id: string): Promise<EntityDetail> {
    return this.client.request<EntityDetail>('GET', `/knowledge/entities/${id}`);
  }

  list(params?: { type?: string; limit?: number; offset?: number; includeArchived?: boolean }): Promise<PaginatedResponse<Entity>> {
    const q: Record<string, string> = {};
    if (params?.type) q.type = params.type;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    if (params?.includeArchived) q.includeArchived = 'true';
    return this.client.request<PaginatedResponse<Entity>>('GET', '/knowledge/entities', undefined, q);
  }

  update(id: string, params: { name?: string; properties?: Record<string, unknown>; archived?: boolean }): Promise<Entity> {
    return this.client.request<Entity>('PATCH', `/knowledge/entities/${id}`, params);
  }

  delete(id: string): Promise<{ message: string }> {
    return this.client.request<{ message: string }>('DELETE', `/knowledge/entities/${id}`);
  }
}

class RelationOperations {
  constructor(private client: SwarmRecallClient) {}

  create(params: { fromEntityId: string; toEntityId: string; relation: string; properties?: Record<string, unknown>; poolId?: string }): Promise<Relation> {
    return this.client.request<Relation>('POST', '/knowledge/relations', params);
  }

  list(params?: { entityId?: string; relation?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<Relation>> {
    const q: Record<string, string> = {};
    if (params?.entityId) q.entityId = params.entityId;
    if (params?.relation) q.relation = params.relation;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    return this.client.request<PaginatedResponse<Relation>>('GET', '/knowledge/relations', undefined, q);
  }

  delete(id: string): Promise<{ message: string }> {
    return this.client.request<{ message: string }>('DELETE', `/knowledge/relations/${id}`);
  }
}

class KnowledgeOperations {
  readonly entities: EntityOperations;
  readonly relations: RelationOperations;

  constructor(private client: SwarmRecallClient) {
    this.entities = new EntityOperations(client);
    this.relations = new RelationOperations(client);
  }

  traverse(params: { startId: string; relation?: string; depth?: number; limit?: number }): Promise<TraversalResult> {
    const q: Record<string, string> = { startId: params.startId };
    if (params.relation) q.relation = params.relation;
    if (params.depth) q.depth = String(params.depth);
    if (params.limit) q.limit = String(params.limit);
    return this.client.request<TraversalResult>('GET', '/knowledge/traverse', undefined, q);
  }

  search(query: string, options?: { limit?: number; minScore?: number }): Promise<{ data: SearchResult<Entity>[] }> {
    return this.client.request<{ data: SearchResult<Entity>[] }>('GET', '/knowledge/search', undefined, {
      q: query,
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.minScore ? { minScore: String(options.minScore) } : {}),
    });
  }

  validate(): Promise<ConstraintValidationResult> {
    return this.client.request<ConstraintValidationResult>('POST', '/knowledge/validate');
  }
}

// --- Learnings ---

class LearningsOperations {
  constructor(private client: SwarmRecallClient) {}

  log(params: {
    category: string; summary: string; details?: string; priority?: string;
    area?: string; suggestedAction?: string; tags?: string[]; metadata?: Record<string, unknown>;
    poolId?: string;
  }): Promise<Learning & { patternId: string | null }> {
    return this.client.request<Learning & { patternId: string | null }>('POST', '/learnings', params);
  }

  search(query: string, options?: { limit?: number; minScore?: number }): Promise<{ data: Array<Learning & { score: number }>; total: number }> {
    return this.client.request<{ data: Array<Learning & { score: number }>; total: number }>('GET', '/learnings/search', undefined, {
      q: query,
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.minScore ? { minScore: String(options.minScore) } : {}),
    });
  }

  get(id: string): Promise<Learning> {
    return this.client.request<Learning>('GET', `/learnings/${id}`);
  }

  list(params?: { category?: string; status?: string; priority?: string; area?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<Learning>> {
    const q: Record<string, string> = {};
    if (params?.category) q.category = params.category;
    if (params?.status) q.status = params.status;
    if (params?.priority) q.priority = params.priority;
    if (params?.area) q.area = params.area;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    return this.client.request<PaginatedResponse<Learning>>('GET', '/learnings', undefined, q);
  }

  update(id: string, params: { status?: string; priority?: string; resolution?: string; resolutionCommit?: string; area?: string; tags?: string[] }): Promise<Learning> {
    return this.client.request<Learning>('PATCH', `/learnings/${id}`, params);
  }

  patterns(): Promise<{ data: LearningPattern[] }> {
    return this.client.request<{ data: LearningPattern[] }>('GET', '/learnings/patterns');
  }

  promotions(): Promise<{ data: LearningPattern[] }> {
    return this.client.request<{ data: LearningPattern[] }>('GET', '/learnings/promotions');
  }

  resolve(id: string, params: { resolution: string; commit?: string }): Promise<Learning> {
    return this.client.request<Learning>('PATCH', `/learnings/${id}`, {
      status: 'resolved',
      resolution: params.resolution,
      resolutionCommit: params.commit,
    });
  }

  link(id: string, targetId: string): Promise<{ patternId: string }> {
    return this.client.request<{ patternId: string }>('POST', `/learnings/${id}/link`, { targetId });
  }
}

// --- Skills ---

class SkillsOperations {
  constructor(private client: SwarmRecallClient) {}

  register(params: {
    name: string; version?: string; source?: string; description?: string;
    triggers?: string[]; dependencies?: string[]; config?: Record<string, unknown>;
    poolId?: string;
  }): Promise<AgentSkill> {
    return this.client.request<AgentSkill>('POST', '/skills', params);
  }

  list(params?: { status?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<AgentSkill>> {
    const q: Record<string, string> = {};
    if (params?.status) q.status = params.status;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    return this.client.request<PaginatedResponse<AgentSkill>>('GET', '/skills', undefined, q);
  }

  get(id: string): Promise<AgentSkill> {
    return this.client.request<AgentSkill>('GET', `/skills/${id}`);
  }

  update(id: string, params: { version?: string; config?: Record<string, unknown>; status?: string }): Promise<AgentSkill> {
    return this.client.request<AgentSkill>('PATCH', `/skills/${id}`, params);
  }

  remove(id: string): Promise<{ success: true }> {
    return this.client.request<{ success: true }>('DELETE', `/skills/${id}`);
  }

  suggest(context: string, limit?: number): Promise<{ data: SuggestedSkill[] }> {
    return this.client.request<{ data: SuggestedSkill[] }>('GET', '/skills/suggest', undefined, {
      context,
      ...(limit ? { limit: String(limit) } : {}),
    });
  }
}

// --- Pools ---

class PoolOperations {
  constructor(private client: SwarmRecallClient) {}

  list(): Promise<{ data: AgentPoolSummary[] }> {
    return this.client.request<{ data: AgentPoolSummary[] }>('GET', '/pools');
  }

  get(poolId: string): Promise<PoolDetail> {
    return this.client.request<PoolDetail>('GET', `/pools/${poolId}`);
  }
}

// --- Dream ---

export interface DuplicateCluster {
  anchor: { id: string; content: string; importance: number };
  members: Array<{ id: string; content: string; importance: number; similarity: number }>;
}

export interface DuplicateClusterResponse {
  clusters: DuplicateCluster[];
  totalClusters: number;
  thresholdUsed: number;
}

export interface UnsummarizedSessionResponse {
  sessions: Array<{ id: string; memoryCount: number; startedAt: string; endedAt: string }>;
  totalSessions: number;
}

export interface EntityPairResponse {
  pairs: Array<{
    entity_a: { id: string; type: string; name: string; properties: Record<string, unknown> };
    entity_b: { id: string; type: string; name: string; properties: Record<string, unknown> };
    similarity: number;
  }>;
  totalPairs: number;
  thresholdUsed: number;
}

export interface StaleMemoryResponse {
  memories: Array<{ id: string; content: string; importance: number; createdAt: string; ageDays: number }>;
  totalStale: number;
  decayAgeDaysUsed: number;
}

export interface ContradictionPairResponse {
  pairs: Array<{
    memory_a: { id: string; content: string; createdAt: string };
    memory_b: { id: string; content: string; createdAt: string };
    similarity: number;
    contentDivergence: number;
  }>;
  totalPairs: number;
}

export interface UnprocessedMemoryResponse {
  memories: Array<{ id: string; content: string; createdAt: string }>;
  totalUnprocessed: number;
}

export interface Tier1Results {
  decay_prune: { memoriesDecayed: number; memoriesPruned: number };
  consolidate_entities: { entitiesMerged: number; relationsRemapped: number; orphansRemoved: number };
  durationMs: number;
}

class DreamOperations {
  constructor(private client: SwarmRecallClient) {}

  // Cycle management

  start(params?: {
    operations?: string[];
    thresholds?: Record<string, number>;
    dryRun?: boolean;
  }): Promise<DreamCycle> {
    return this.client.request<DreamCycle>('POST', '/dream', params);
  }

  get(id: string): Promise<DreamCycle> {
    return this.client.request<DreamCycle>('GET', `/dream/${id}`);
  }

  list(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<DreamCycle>> {
    return this.client.request<PaginatedResponse<DreamCycle>>(
      'GET',
      '/dream',
      undefined,
      params as Record<string, string>,
    );
  }

  update(id: string, params: {
    status?: string;
    results?: Record<string, unknown>;
    error?: string;
  }): Promise<DreamCycle> {
    return this.client.request<DreamCycle>('PATCH', `/dream/${id}`, params);
  }

  complete(id: string, results: DreamResults): Promise<DreamCycle> {
    return this.update(id, { status: 'completed', results: results as unknown as Record<string, unknown> });
  }

  fail(id: string, error: string): Promise<DreamCycle> {
    return this.update(id, { status: 'failed', error });
  }

  // Config

  getConfig(): Promise<DreamConfig> {
    return this.client.request<DreamConfig>('GET', '/dream/config');
  }

  updateConfig(params: {
    enabled?: boolean;
    intervalHours?: number;
    operations?: string[];
    thresholds?: Record<string, number>;
  }): Promise<DreamConfig> {
    return this.client.request<DreamConfig>('PATCH', '/dream/config', params);
  }

  // Candidates

  getDuplicates(params?: { limit?: number }): Promise<DuplicateClusterResponse> {
    return this.client.request<DuplicateClusterResponse>(
      'GET', '/dream/candidates/duplicates', undefined,
      params as Record<string, string>,
    );
  }

  getUnsummarizedSessions(params?: { limit?: number }): Promise<UnsummarizedSessionResponse> {
    return this.client.request<UnsummarizedSessionResponse>(
      'GET', '/dream/candidates/unsummarized-sessions', undefined,
      params as Record<string, string>,
    );
  }

  getDuplicateEntities(params?: { limit?: number }): Promise<EntityPairResponse> {
    return this.client.request<EntityPairResponse>(
      'GET', '/dream/candidates/duplicate-entities', undefined,
      params as Record<string, string>,
    );
  }

  getStale(params?: { limit?: number }): Promise<StaleMemoryResponse> {
    return this.client.request<StaleMemoryResponse>(
      'GET', '/dream/candidates/stale', undefined,
      params as Record<string, string>,
    );
  }

  getContradictions(params?: { limit?: number }): Promise<ContradictionPairResponse> {
    return this.client.request<ContradictionPairResponse>(
      'GET', '/dream/candidates/contradictions', undefined,
      params as Record<string, string>,
    );
  }

  getUnprocessed(params?: { limit?: number }): Promise<UnprocessedMemoryResponse> {
    return this.client.request<UnprocessedMemoryResponse>(
      'GET', '/dream/candidates/unprocessed', undefined,
      params as Record<string, string>,
    );
  }

  // Tier 1 execution

  execute(params?: { operations?: string[] }): Promise<Tier1Results> {
    return this.client.request<Tier1Results>('POST', '/dream/execute', params);
  }
}
