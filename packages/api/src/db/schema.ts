import {
  pgTable, text, uuid, timestamp, real, jsonb, serial, integer,
  index, uniqueIndex, customType,
} from 'drizzle-orm/pg-core';

// Custom vector type for pgvector
const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown) {
    const str = value as string;
    return str
      .slice(1, -1)
      .split(',')
      .map(Number);
  },
});

// --- Core ---

export const owners = pgTable('owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: text('firebase_uid').unique(),
  email: text('email'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  plan: text('plan').notNull().default('free'),
  claimed: text('claimed').notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('agents_owner_idx').on(t.ownerId)],
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    agentId: uuid('agent_id').references(() => agents.id),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    scopes: text('scopes').array().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('api_keys_hash_idx').on(t.keyHash),
    index('api_keys_owner_idx').on(t.ownerId),
  ],
);

export const claimTokens = pgTable(
  'claim_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull().unique(),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    claimedBy: uuid('claimed_by').references(() => owners.id),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('claim_tokens_token_idx').on(t.token),
    index('claim_tokens_owner_idx').on(t.ownerId),
  ],
);

// --- Memory ---

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    content: text('content').notNull(),
    category: text('category').notNull(),
    importance: real('importance').notNull().default(0.5),
    tags: text('tags').array().notNull().default([]),
    metadata: jsonb('metadata'),
    embedding: vector('embedding'),
    sessionId: uuid('session_id').references(() => memorySessions.id),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('memories_agent_idx').on(t.agentId),
    index('memories_owner_idx').on(t.ownerId),
    index('memories_category_idx').on(t.category),
  ],
);

export const memorySessions = pgTable(
  'memory_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    context: jsonb('context'),
    currentState: jsonb('current_state'),
    summary: text('summary'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('memory_sessions_agent_idx').on(t.agentId),
    index('memory_sessions_owner_idx').on(t.ownerId),
  ],
);

// --- Knowledge ---

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    type: text('type').notNull(),
    name: text('name').notNull(),
    properties: jsonb('properties').notNull().default({}),
    embedding: vector('embedding'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('entities_agent_idx').on(t.agentId),
    index('entities_owner_idx').on(t.ownerId),
    index('entities_type_idx').on(t.type),
  ],
);

export const relations = pgTable(
  'relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    fromEntityId: uuid('from_entity_id').notNull().references(() => entities.id),
    toEntityId: uuid('to_entity_id').notNull().references(() => entities.id),
    relation: text('relation').notNull(),
    properties: jsonb('properties'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('relations_agent_idx').on(t.agentId),
    index('relations_owner_idx').on(t.ownerId),
    index('relations_from_idx').on(t.fromEntityId),
    index('relations_to_idx').on(t.toEntityId),
  ],
);

export const entityTypes = pgTable(
  'entity_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    name: text('name').notNull(),
    schema: jsonb('schema').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('entity_types_owner_idx').on(t.ownerId)],
);

// --- Learnings ---

export const learnings = pgTable(
  'learnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    category: text('category').notNull(),
    summary: text('summary').notNull(),
    details: text('details'),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('pending'),
    area: text('area'),
    suggestedAction: text('suggested_action'),
    resolution: text('resolution'),
    resolutionCommit: text('resolution_commit'),
    embedding: vector('embedding'),
    tags: text('tags').array().notNull().default([]),
    metadata: jsonb('metadata'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('learnings_agent_idx').on(t.agentId),
    index('learnings_owner_idx').on(t.ownerId),
    index('learnings_category_idx').on(t.category),
    index('learnings_status_idx').on(t.status),
  ],
);

export const learningPatterns = pgTable(
  'learning_patterns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    patternSummary: text('pattern_summary').notNull(),
    recurrenceCount: integer('recurrence_count').notNull().default(1),
    sessionCount: integer('session_count').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    promotedAt: timestamp('promoted_at', { withTimezone: true }),
    learningIds: text('learning_ids').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('learning_patterns_agent_idx').on(t.agentId),
    index('learning_patterns_owner_idx').on(t.ownerId),
  ],
);

// --- Skills ---

export const agentSkills = pgTable(
  'agent_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    name: text('name').notNull(),
    version: text('version'),
    source: text('source'),
    description: text('description'),
    triggers: text('triggers').array().notNull().default([]),
    dependencies: text('dependencies').array().notNull().default([]),
    config: jsonb('config'),
    status: text('status').notNull().default('active'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    invocationCount: integer('invocation_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('agent_skills_agent_idx').on(t.agentId),
    index('agent_skills_owner_idx').on(t.ownerId),
  ],
);

export const skillOverrides = pgTable(
  'skill_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id').notNull().references(() => agentSkills.id),
    agentId: uuid('agent_id').notNull().references(() => agents.id),
    overrides: jsonb('overrides').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('skill_overrides_skill_idx').on(t.skillId)],
);

// --- Audit ---

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    eventType: text('event_type').notNull(),
    actorId: uuid('actor_id'),
    targetId: uuid('target_id'),
    targetType: text('target_type'),
    ownerId: uuid('owner_id').notNull(),
    payload: jsonb('payload'),
  },
  (t) => [
    index('audit_log_timestamp_idx').on(t.timestamp),
    index('audit_log_owner_idx').on(t.ownerId),
    index('audit_log_event_type_idx').on(t.eventType),
  ],
);
