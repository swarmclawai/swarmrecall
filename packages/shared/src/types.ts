import type {
  MemoryCategory, LearningCategory, LearningPriority, LearningStatus,
  LearningArea, SkillStatus, AgentStatus, ApiKeyScope, EntityTypeName,
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
