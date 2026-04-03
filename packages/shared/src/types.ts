import type {
  MemoryCategory, LearningCategory, LearningPriority, LearningStatus,
  LearningArea, SkillStatus, AgentStatus, ApiKeyScope, EntityTypeName,
  PoolAccessLevel, DreamOperation, DreamStatus, DreamTrigger,
} from './constants.js';

// --- Core ---

export interface Owner {
  id: string;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  ownerId: string;
  agentId: string | null;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// --- Pools ---

export interface Pool {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoolMember {
  id: string;
  poolId: string;
  agentId: string;
  ownerId: string;
  memoryAccess: PoolAccessLevel;
  knowledgeAccess: PoolAccessLevel;
  learningsAccess: PoolAccessLevel;
  skillsAccess: PoolAccessLevel;
  joinedAt: string;
}

// --- Memory ---

export interface Memory {
  id: string;
  agentId: string;
  ownerId: string;
  content: string;
  category: MemoryCategory;
  importance: number;
  tags: string[];
  metadata: Record<string, unknown> | null;
  sessionId: string | null;
  poolId: string | null;
  poolName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySession {
  id: string;
  agentId: string;
  ownerId: string;
  context: Record<string, unknown> | null;
  currentState: Record<string, unknown> | null;
  summary: string | null;
  poolId: string | null;
  poolName: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

// --- Knowledge ---

export interface Entity {
  id: string;
  agentId: string;
  ownerId: string;
  type: EntityTypeName | string;
  name: string;
  properties: Record<string, unknown>;
  poolId: string | null;
  poolName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Relation {
  id: string;
  agentId: string;
  ownerId: string;
  fromEntityId: string;
  toEntityId: string;
  relation: string;
  properties: Record<string, unknown> | null;
  poolId: string | null;
  poolName: string | null;
  createdAt: string;
}

export interface EntityType {
  id: string;
  ownerId: string;
  name: string;
  schema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// --- Learnings ---

export interface Learning {
  id: string;
  agentId: string;
  ownerId: string;
  category: LearningCategory;
  summary: string;
  details: string | null;
  priority: LearningPriority;
  status: LearningStatus;
  area: LearningArea | null;
  suggestedAction: string | null;
  resolution: string | null;
  resolutionCommit: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  poolId: string | null;
  poolName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPattern {
  id: string;
  agentId: string;
  ownerId: string;
  patternSummary: string;
  recurrenceCount: number;
  sessionCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  promotedAt: string | null;
  learningIds: string[];
  poolId: string | null;
  poolName: string | null;
  createdAt: string;
}

// --- Skills ---

export interface AgentSkill {
  id: string;
  agentId: string;
  ownerId: string;
  name: string;
  version: string | null;
  source: string | null;
  description: string | null;
  triggers: string[];
  dependencies: string[];
  config: Record<string, unknown> | null;
  status: SkillStatus;
  lastUsedAt: string | null;
  invocationCount: number;
  errorCount: number;
  poolId: string | null;
  poolName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillOverride {
  id: string;
  skillId: string;
  agentId: string;
  overrides: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// --- Audit ---

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  eventType: string;
  actorId: string | null;
  targetId: string | null;
  targetType: string | null;
  ownerId: string;
  payload: Record<string, unknown> | null;
}

// --- Registration ---

export interface ClaimToken {
  id: string;
  token: string;
  ownerId: string;
  agentId: string;
  claimedBy: string | null;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface RegisterResponse {
  apiKey: string;
  agentId: string;
  ownerId: string;
  claimToken: string;
  claimUrl: string;
}

export interface ClaimResponse {
  ownerId: string;
  agentId: string;
  agentName: string;
}

// --- API Context ---

export interface ApiKeyContext {
  ownerId: string;
  agentId: string;
  scopes: ApiKeyScope[];
  keyId: string;
}

export interface FirebaseAuthContext {
  ownerId: string;
  firebaseUid: string;
  email: string | null;
}

// --- Pagination ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResult<T> {
  data: T;
  score: number;
}

// --- Dreaming ---

export interface DreamCycle {
  id: string;
  agentId: string | null;
  poolId: string | null;
  ownerId: string;
  status: DreamStatus;
  operations: DreamOperation[];
  results: DreamResults | null;
  trigger: DreamTrigger;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface DreamResults {
  deduplicate?: {
    clustersFound: number;
    memoriesMerged: number;
    memoriesArchived: number;
  };
  summarize_sessions?: {
    sessionsProcessed: number;
    summariesCreated: number;
    memoriesDecayed: number;
  };
  decay_prune?: {
    memoriesDecayed: number;
    memoriesPruned: number;
  };
  consolidate_entities?: {
    entitiesMerged: number;
    relationsRemapped: number;
    orphansRemoved: number;
  };
  promote_learnings?: {
    patternsEvaluated: number;
    learningsPromoted: number;
  };
  enrich_knowledge_graph?: {
    memoriesProcessed: number;
    entitiesLinked: number;
    relationsCreated: number;
  };
  durationMs: number;
}

export interface DreamConfig {
  id: string;
  agentId: string | null;
  poolId: string | null;
  ownerId: string;
  enabled: boolean;
  intervalHours: number;
  operations: DreamOperation[];
  thresholds: Partial<DreamThresholds>;
  lastDreamAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DreamThresholds {
  similarityThreshold: number;
  decayAgeDays: number;
  decayFactor: number;
  pruneThreshold: number;
  sessionDecay: number;
  entitySimilarity: number;
  batchSize: number;
}

// --- Observability ---

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: { ok: boolean; latencyMs: number };
    meilisearch: { ok: boolean; latencyMs: number };
    pgvector: { ok: boolean };
    redis: { ok: boolean };
  };
}

export interface UsageMetrics {
  series: Array<{
    date: string;
    memories: number;
    entities: number;
    learnings: number;
    skills: number;
  }>;
}

export interface ApiMetricsSummary {
  totalRequests: number;
  avgDurationMs: number;
  errorRate: number;
  p95DurationMs: number;
  byStatus: Array<{ statusCode: number; count: number }>;
  byPath: Array<{ path: string; count: number; avgDurationMs: number }>;
  series: Array<{ hour: string; count: number; avgDurationMs: number }>;
}

export interface SearchMetricsSummary {
  totalSearches: number;
  avgDurationMs: number;
  avgResultCount: number;
  byMethod: Array<{ method: string; count: number; avgDurationMs: number; avgResultCount: number }>;
  byIndex: Array<{ indexName: string; count: number; avgDurationMs: number }>;
  series: Array<{ hour: string; count: number; avgDurationMs: number }>;
}

export interface StorageBreakdown {
  memories: { count: number; estimatedSizeMb: number };
  entities: { count: number; estimatedSizeMb: number };
  relations: { count: number; estimatedSizeMb: number };
  learnings: { count: number; estimatedSizeMb: number };
  skills: { count: number; estimatedSizeMb: number };
  auditLog: { count: number; estimatedSizeMb: number };
  totalEstimatedSizeMb: number;
}
