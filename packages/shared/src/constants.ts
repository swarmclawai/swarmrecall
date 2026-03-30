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

// --- API Key Scopes ---

export const API_KEY_SCOPES = [
  'memory.read', 'memory.write',
  'knowledge.read', 'knowledge.write',
  'learnings.read', 'learnings.write',
  'skills.read', 'skills.write',
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
