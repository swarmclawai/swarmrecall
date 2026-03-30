import { z } from 'zod';
import {
  MEMORY_CATEGORIES, LEARNING_CATEGORIES, LEARNING_PRIORITIES,
  LEARNING_STATUSES, LEARNING_AREAS, SKILL_STATUSES, API_KEY_SCOPES,
  ENTITY_TYPES,
} from './constants.js';

// --- Pagination ---

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  minScore: z.coerce.number().min(0).max(1).default(0.3),
});

// --- Memory ---

export const MemoryCreateSchema = z.object({
  content: z.string().min(1).max(10000),
  category: z.enum(MEMORY_CATEGORIES),
  importance: z.number().min(0).max(1).default(0.5),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metadata: z.record(z.unknown()).optional(),
  sessionId: z.string().uuid().optional(),
});

export const MemoryUpdateSchema = z.object({
  importance: z.number().min(0).max(1).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
  archived: z.boolean().optional(),
});

export const MemoryListSchema = PaginationSchema.extend({
  category: z.enum(MEMORY_CATEGORIES).optional(),
  sessionId: z.string().uuid().optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const SessionCreateSchema = z.object({
  context: z.record(z.unknown()).optional(),
});

export const SessionUpdateSchema = z.object({
  currentState: z.record(z.unknown()).optional(),
  summary: z.string().max(5000).optional(),
  ended: z.boolean().optional(),
});

// --- Knowledge ---

export const EntityCreateSchema = z.object({
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  properties: z.record(z.unknown()).default({}),
});

export const EntityUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  properties: z.record(z.unknown()).optional(),
  archived: z.boolean().optional(),
});

export const EntityListSchema = PaginationSchema.extend({
  type: z.string().optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const RelationCreateSchema = z.object({
  fromEntityId: z.string().uuid(),
  toEntityId: z.string().uuid(),
  relation: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
});

export const RelationListSchema = PaginationSchema.extend({
  entityId: z.string().uuid().optional(),
  relation: z.string().optional(),
});

export const TraverseSchema = z.object({
  startId: z.string().uuid(),
  relation: z.string().optional(),
  depth: z.coerce.number().int().min(1).max(5).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const EntityTypeCreateSchema = z.object({
  name: z.string().min(1).max(50),
  schema: z.record(z.unknown()),
});

// --- Learnings ---

export const LearningCreateSchema = z.object({
  category: z.enum(LEARNING_CATEGORIES),
  summary: z.string().min(1).max(1000),
  details: z.string().max(10000).optional(),
  priority: z.enum(LEARNING_PRIORITIES).default('medium'),
  area: z.enum(LEARNING_AREAS).optional(),
  suggestedAction: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const LearningUpdateSchema = z.object({
  status: z.enum(LEARNING_STATUSES).optional(),
  priority: z.enum(LEARNING_PRIORITIES).optional(),
  resolution: z.string().max(2000).optional(),
  resolutionCommit: z.string().max(100).optional(),
  area: z.enum(LEARNING_AREAS).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const LearningListSchema = PaginationSchema.extend({
  category: z.enum(LEARNING_CATEGORIES).optional(),
  status: z.enum(LEARNING_STATUSES).optional(),
  priority: z.enum(LEARNING_PRIORITIES).optional(),
  area: z.enum(LEARNING_AREAS).optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const LearningLinkSchema = z.object({
  targetId: z.string().uuid(),
});

// --- Skills ---

export const SkillRegisterSchema = z.object({
  name: z.string().min(1).max(200),
  version: z.string().max(50).optional(),
  source: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  triggers: z.array(z.string().max(200)).max(20).default([]),
  dependencies: z.array(z.string().max(200)).max(50).default([]),
  config: z.record(z.unknown()).optional(),
});

export const SkillUpdateSchema = z.object({
  version: z.string().max(50).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(SKILL_STATUSES).optional(),
});

export const SkillListSchema = PaginationSchema.extend({
  status: z.enum(SKILL_STATUSES).optional(),
});

export const SkillUsageSchema = z.object({
  success: z.boolean().default(true),
});

// --- API Keys ---

export const ApiKeyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  agentId: z.string().uuid().optional(),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
  expiresAt: z.string().datetime().optional(),
});

// --- Agents ---

export const AgentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
});

export const AgentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
});

// --- Registration ---

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const ClaimSchema = z.object({
  claimToken: z.string().min(1).max(20),
});

// --- Inferred types ---

export type MemoryCreate = z.infer<typeof MemoryCreateSchema>;
export type MemoryUpdate = z.infer<typeof MemoryUpdateSchema>;
export type MemoryList = z.infer<typeof MemoryListSchema>;
export type SessionCreate = z.infer<typeof SessionCreateSchema>;
export type SessionUpdate = z.infer<typeof SessionUpdateSchema>;
export type EntityCreate = z.infer<typeof EntityCreateSchema>;
export type EntityUpdate = z.infer<typeof EntityUpdateSchema>;
export type EntityList = z.infer<typeof EntityListSchema>;
export type RelationCreate = z.infer<typeof RelationCreateSchema>;
export type TraverseQuery = z.infer<typeof TraverseSchema>;
export type LearningCreate = z.infer<typeof LearningCreateSchema>;
export type LearningUpdate = z.infer<typeof LearningUpdateSchema>;
export type LearningList = z.infer<typeof LearningListSchema>;
export type SkillRegister = z.infer<typeof SkillRegisterSchema>;
export type SkillUpdate = z.infer<typeof SkillUpdateSchema>;
export type SkillList = z.infer<typeof SkillListSchema>;
export type ApiKeyCreate = z.infer<typeof ApiKeyCreateSchema>;
export type AgentCreate = z.infer<typeof AgentCreateSchema>;
export type AgentUpdate = z.infer<typeof AgentUpdateSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
