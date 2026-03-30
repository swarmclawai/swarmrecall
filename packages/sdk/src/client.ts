import { SwarmRecallError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError, RateLimitError } from './errors.js';

export interface SwarmRecallClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface RegisterOptions {
  name?: string;
  baseUrl?: string;
}

export interface RegisterResponse {
  apiKey: string;
  claimToken: string;
}

export class SwarmRecallClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  readonly memory: MemoryOperations;
  readonly knowledge: KnowledgeOperations;
  readonly learnings: LearningsOperations;
  readonly skills: SkillsOperations;

  constructor(options: SwarmRecallClientOptions) {
    this.baseUrl = (options.baseUrl ?? 'https://api.swarmrecall.ai').replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.memory = new MemoryOperations(this);
    this.knowledge = new KnowledgeOperations(this);
    this.learnings = new LearningsOperations(this);
    this.skills = new SkillsOperations(this);
  }

  /**
   * Register a new agent and receive an API key. No account required.
   * The returned claimToken can be used at swarmrecall.ai/claim to link
   * the agent to a user account.
   */
  static async register(options?: RegisterOptions): Promise<RegisterResponse> {
    const url = (options?.baseUrl ?? 'https://api.swarmrecall.ai').replace(/\/+$/, '');
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

  start(params?: { context?: Record<string, unknown> }) {
    return this.client.request('POST', '/memory/sessions', params);
  }

  current() {
    return this.client.request('GET', '/memory/sessions/current');
  }

  update(id: string, params: { currentState?: Record<string, unknown>; summary?: string; ended?: boolean }) {
    return this.client.request('PATCH', `/memory/sessions/${id}`, params);
  }

  list(params?: { limit?: number; offset?: number }) {
    return this.client.request('GET', '/memory/sessions', undefined, params as Record<string, string>);
  }
}

class MemoryOperations {
  readonly sessions: SessionOperations;

  constructor(private client: SwarmRecallClient) {
    this.sessions = new SessionOperations(client);
  }

  store(params: { content: string; category: string; importance?: number; tags?: string[]; metadata?: Record<string, unknown>; sessionId?: string }) {
    return this.client.request('POST', '/memory', params);
  }

  search(query: string, options?: { limit?: number; minScore?: number }) {
    return this.client.request('GET', '/memory/search', undefined, {
      q: query,
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.minScore ? { minScore: String(options.minScore) } : {}),
    });
  }

  get(id: string) {
    return this.client.request('GET', `/memory/${id}`);
  }

  list(params?: { category?: string; sessionId?: string; limit?: number; offset?: number; includeArchived?: boolean }) {
    const q: Record<string, string> = {};
    if (params?.category) q.category = params.category;
    if (params?.sessionId) q.sessionId = params.sessionId;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    if (params?.includeArchived) q.includeArchived = 'true';
    return this.client.request('GET', '/memory', undefined, q);
  }

  update(id: string, params: { importance?: number; tags?: string[]; metadata?: Record<string, unknown>; archived?: boolean }) {
    return this.client.request('PATCH', `/memory/${id}`, params);
  }

  delete(id: string) {
    return this.client.request('DELETE', `/memory/${id}`);
  }
}

// --- Knowledge ---

class EntityOperations {
  constructor(private client: SwarmRecallClient) {}

  create(params: { type: string; name: string; properties?: Record<string, unknown> }) {
    return this.client.request('POST', '/knowledge/entities', params);
  }

  get(id: string) {
    return this.client.request('GET', `/knowledge/entities/${id}`);
  }

  list(params?: { type?: string; limit?: number; offset?: number; includeArchived?: boolean }) {
    const q: Record<string, string> = {};
    if (params?.type) q.type = params.type;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    if (params?.includeArchived) q.includeArchived = 'true';
    return this.client.request('GET', '/knowledge/entities', undefined, q);
  }

  update(id: string, params: { name?: string; properties?: Record<string, unknown>; archived?: boolean }) {
    return this.client.request('PATCH', `/knowledge/entities/${id}`, params);
  }

  delete(id: string) {
    return this.client.request('DELETE', `/knowledge/entities/${id}`);
  }
}

class RelationOperations {
  constructor(private client: SwarmRecallClient) {}

  create(params: { fromEntityId: string; toEntityId: string; relation: string; properties?: Record<string, unknown> }) {
    return this.client.request('POST', '/knowledge/relations', params);
  }

  list(params?: { entityId?: string; relation?: string; limit?: number; offset?: number }) {
    const q: Record<string, string> = {};
    if (params?.entityId) q.entityId = params.entityId;
    if (params?.relation) q.relation = params.relation;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    return this.client.request('GET', '/knowledge/relations', undefined, q);
  }

  delete(id: string) {
    return this.client.request('DELETE', `/knowledge/relations/${id}`);
  }
}

class KnowledgeOperations {
  readonly entities: EntityOperations;
  readonly relations: RelationOperations;

  constructor(private client: SwarmRecallClient) {
    this.entities = new EntityOperations(client);
    this.relations = new RelationOperations(client);
  }

  traverse(params: { startId: string; relation?: string; depth?: number; limit?: number }) {
    const q: Record<string, string> = { startId: params.startId };
    if (params.relation) q.relation = params.relation;
    if (params.depth) q.depth = String(params.depth);
    if (params.limit) q.limit = String(params.limit);
    return this.client.request('GET', '/knowledge/traverse', undefined, q);
  }

  search(query: string, options?: { limit?: number; minScore?: number }) {
    return this.client.request('GET', '/knowledge/search', undefined, {
      q: query,
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.minScore ? { minScore: String(options.minScore) } : {}),
    });
  }

  validate() {
    return this.client.request('POST', '/knowledge/validate');
  }
}

// --- Learnings ---

class LearningsOperations {
  constructor(private client: SwarmRecallClient) {}

  log(params: {
    category: string; summary: string; details?: string; priority?: string;
    area?: string; suggestedAction?: string; tags?: string[]; metadata?: Record<string, unknown>;
  }) {
    return this.client.request('POST', '/learnings', params);
  }

  search(query: string, options?: { limit?: number; minScore?: number }) {
    return this.client.request('GET', '/learnings/search', undefined, {
      q: query,
      ...(options?.limit ? { limit: String(options.limit) } : {}),
      ...(options?.minScore ? { minScore: String(options.minScore) } : {}),
    });
  }

  get(id: string) {
    return this.client.request('GET', `/learnings/${id}`);
  }

  list(params?: { category?: string; status?: string; priority?: string; area?: string; limit?: number; offset?: number }) {
    const q: Record<string, string> = {};
    if (params?.category) q.category = params.category;
    if (params?.status) q.status = params.status;
    if (params?.priority) q.priority = params.priority;
    if (params?.area) q.area = params.area;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    return this.client.request('GET', '/learnings', undefined, q);
  }

  update(id: string, params: { status?: string; priority?: string; resolution?: string; resolutionCommit?: string; area?: string; tags?: string[] }) {
    return this.client.request('PATCH', `/learnings/${id}`, params);
  }

  patterns() {
    return this.client.request('GET', '/learnings/patterns');
  }

  promotions() {
    return this.client.request('GET', '/learnings/promotions');
  }

  resolve(id: string, params: { resolution: string; commit?: string }) {
    return this.client.request('PATCH', `/learnings/${id}`, {
      status: 'resolved',
      resolution: params.resolution,
      resolutionCommit: params.commit,
    });
  }

  link(id: string, targetId: string) {
    return this.client.request('POST', `/learnings/${id}/link`, { targetId });
  }
}

// --- Skills ---

class SkillsOperations {
  constructor(private client: SwarmRecallClient) {}

  register(params: {
    name: string; version?: string; source?: string; description?: string;
    triggers?: string[]; dependencies?: string[]; config?: Record<string, unknown>;
  }) {
    return this.client.request('POST', '/skills', params);
  }

  list(params?: { status?: string; limit?: number; offset?: number }) {
    const q: Record<string, string> = {};
    if (params?.status) q.status = params.status;
    if (params?.limit) q.limit = String(params.limit);
    if (params?.offset) q.offset = String(params.offset);
    return this.client.request('GET', '/skills', undefined, q);
  }

  get(id: string) {
    return this.client.request('GET', `/skills/${id}`);
  }

  update(id: string, params: { version?: string; config?: Record<string, unknown>; status?: string }) {
    return this.client.request('PATCH', `/skills/${id}`, params);
  }

  remove(id: string) {
    return this.client.request('DELETE', `/skills/${id}`);
  }

  suggest(context: string, limit?: number) {
    return this.client.request('GET', '/skills/suggest', undefined, {
      context,
      ...(limit ? { limit: String(limit) } : {}),
    });
  }
}
