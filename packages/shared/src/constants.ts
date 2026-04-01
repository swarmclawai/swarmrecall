// --- Memory ---

export const MEMORY_CATEGORIES = ['fact', 'preference', 'decision', 'context', 'session_summary'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

// --- Knowledge ---

export const ENTITY_TYPES = [
  'Person', 'Organization', 'Project', 'Task', 'Goal', 'Event',
  'Location', 'Document', 'Message', 'Thread', 'Note', 'Account',
  'Device', 'Credential', 'Action', 'Policy',
] as const;
export type EntityTypeName = (typeof ENTITY_TYPES)[number];

// --- Learnings ---

export const LEARNING_CATEGORIES = [
  'correction', 'insight', 'knowledge_gap', 'best_practice', 'error', 'feature_request',
] as const;
export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export const LEARNING_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type LearningPriority = (typeof LEARNING_PRIORITIES)[number];

export const LEARNING_STATUSES = ['pending', 'in_progress', 'resolved', 'wont_fix', 'promoted'] as const;
export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export const LEARNING_AREAS = ['frontend', 'backend', 'infra', 'tests', 'docs', 'config'] as const;
export type LearningArea = (typeof LEARNING_AREAS)[number];

// --- Skills ---

export const SKILL_STATUSES = ['active', 'disabled', 'outdated', 'error'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

// --- Agents ---

export const AGENT_STATUSES = ['active', 'suspended', 'deleted'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

// --- Pools ---

export const POOL_ACCESS_LEVELS = ['none', 'read', 'readwrite'] as const;
export type PoolAccessLevel = (typeof POOL_ACCESS_LEVELS)[number];

export const POOL_DATA_TYPES = ['memory', 'knowledge', 'learnings', 'skills'] as const;
export type PoolDataType = (typeof POOL_DATA_TYPES)[number];

// --- API Key Scopes ---

export const API_KEY_SCOPES = [
  'memory.read', 'memory.write',
  'knowledge.read', 'knowledge.write',
  'learnings.read', 'learnings.write',
  'skills.read', 'skills.write',
  'pools.read', 'pools.write',
  'dream.read', 'dream.write',
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

// --- Thresholds ---

export const RATE_LIMIT_DEFAULT = 60;
export const RATE_LIMIT_SEARCH = 30;
export const PROMOTION_THRESHOLD = 3;
export const PROMOTION_SESSION_MIN = 2;
export const PROMOTION_WINDOW_DAYS = 30;
export const SIMILARITY_THRESHOLD = 0.85;
export const EMBEDDING_DIMENSIONS = 1536;
export const API_KEY_PREFIX = 'sr_live_';
export const CLAIM_TOKEN_PREFIX = 'RECALL';
export const CLAIM_TOKEN_EXPIRY_DAYS = 30;
export const RATE_LIMIT_REGISTER = 10;
export const UNCLAIMED_MEMORY_LIMIT = 1000;
export const UNCLAIMED_ENTITY_LIMIT = 500;
export const UNCLAIMED_LEARNING_LIMIT = 500;

// --- Dreaming ---

export const DREAM_OPERATIONS = [
  'deduplicate',
  'summarize_sessions',
  'decay_prune',
  'consolidate_entities',
  'promote_learnings',
  'enrich_knowledge_graph',
  'resolve_contradictions',
] as const;
export type DreamOperation = (typeof DREAM_OPERATIONS)[number];

export const DREAM_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type DreamStatus = (typeof DREAM_STATUSES)[number];

export const DREAM_TRIGGERS = ['manual', 'scheduled', 'api'] as const;
export type DreamTrigger = (typeof DREAM_TRIGGERS)[number];

export const DREAM_SIMILARITY_THRESHOLD = 0.90;
export const DREAM_DECAY_AGE_DAYS = 30;
export const DREAM_DECAY_FACTOR = 0.95;
export const DREAM_PRUNE_THRESHOLD = 0.05;
export const DREAM_SESSION_DECAY = 0.15;
export const DREAM_DEFAULT_INTERVAL_HOURS = 24;
export const DREAM_BATCH_SIZE = 500;
export const DREAM_ENTITY_SIMILARITY = 0.92;
