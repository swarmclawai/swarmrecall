# Agent Dreaming — Feature Spec

> Background memory consolidation for SwarmRecall agents.
> Inspired by how biological sleep consolidates, prunes, and reorganizes memories.

## Overview

"Dreaming" is an offline process that consolidates, deduplicates, summarizes, prunes, and reorganizes stored memories, entities, learnings, and relations while the agent is idle. The goal is to keep the memory store lean, relevant, and semantically coherent over time — reducing token cost at query time and improving retrieval accuracy.

## Architecture: Two-Tier Dreaming

This feature uses a **two-tier architecture** that separates what the server can do mechanically from what requires LLM intelligence.

### Tier 1 — Server-Side Primitives (SwarmRecall runs these)

Pure-math, deterministic operations that don't need an LLM. SwarmRecall executes these server-side on a schedule or on-demand:

- **Find duplicates** — Return clusters of memories with embedding similarity above threshold
- **Decay importance** — Apply time-based decay formula to old memories
- **Prune** — Archive memories below an importance threshold
- **Orphan cleanup** — Remove relations pointing to archived entities
- **Session gap detection** — Find completed sessions missing summaries
- **Promotion candidates** — Surface learning patterns meeting promotion criteria (existing logic)

These are safe to run automatically — they're reversible (soft-delete), deterministic, and cheap.

### Tier 2 — Agent-Driven Dreaming (The LLM does these)

Intelligent operations where the **agent itself** is the dreamer. SwarmRecall exposes API primitives that let an agent orchestrate its own dream cycle — reading its memories, reasoning about them, and writing back consolidated results:

- **Merge duplicate clusters** — Agent reads a cluster of similar memories (found by Tier 1), decides what to keep, writes a merged memory, archives the rest
- **Summarize sessions** — Agent reads a session's memories, writes a `session_summary` memory
- **Resolve contradictions** — Agent reads conflicting memories, decides which is current, updates or archives the stale one
- **Consolidate entities** — Agent reviews near-duplicate entities, decides merge vs. keep-both
- **Enrich knowledge graph** — Agent reads recent memories, extracts entities and relations, writes them back
- **Promote learnings** — Agent reads pattern candidates, synthesizes a best-practice learning

This mirrors the Claude Code autodream pattern: **spawn a sub-agent → orient (read index) → gather (scan memories) → consolidate (merge/update/fix) → prune (archive stale)**. The LLM uses SwarmRecall's existing memory/knowledge/learnings APIs as its tools.

### Why Both Tiers?

SwarmRecall is a **persistence layer**, not an LLM orchestrator. It shouldn't own the LLM inference bill or the prompt engineering. But it *should* do the mechanical work that makes agent-driven dreaming efficient:

1. **Server finds candidates** → Agent decides what to do with them
2. **Server decays and prunes** → Agent never has to deal with the noise
3. **Server tracks dream cycles** → Agent (and dashboard) can see what happened and when
4. **Server prevents concurrent dreams** → Locking handled at the API level

Agents that want full control can skip Tier 1 and orchestrate everything themselves using the primitive endpoints. Agents that want a hands-off experience can enable Tier 1 auto-dreaming and optionally layer Tier 2 on top.

### How an Agent Dreams (Example Flow)

```
1. Agent idle detected (by agent framework, not SwarmRecall)
2. POST /api/v1/dream — start a dream cycle (acquires lock)
3. GET  /api/v1/dream/candidates/duplicates — server returns memory clusters
4. For each cluster:
   - Agent reads the memories, reasons about them
   - PATCH /api/v1/memory/:anchorId — update content with merged version
   - PATCH /api/v1/memory/:otherId — archive the duplicate
5. GET  /api/v1/dream/candidates/unsummarized-sessions — server returns session IDs
6. For each session:
   - GET /api/v1/memory?sessionId=X — read session memories
   - POST /api/v1/memory — write session_summary
7. PATCH /api/v1/dream/:cycleId — mark cycle complete with results
```

---

## Motivation

Without consolidation, agent memory stores grow unboundedly and degrade over time:

- **Redundancy** — The same fact gets stored across multiple sessions with slight variations.
- **Staleness** — Outdated decisions and context remain at the same importance as current ones.
- **Fragmentation** — Related memories are scattered across sessions with no synthesized summary.
- **Cost** — Larger context windows and more search results mean higher token usage at query time.

Research from Letta (sleep-time compute), CrewAI (cognitive memory), and others shows that offline consolidation yields 26–40% accuracy improvements on long-horizon tasks and up to 30–117x token reduction at query time.

---

## Dream Operations

A dream cycle runs one or more **operations** against an agent's data. Each operation is independent and can be enabled/disabled via configuration. Operations are tagged with their tier.

### 1. Deduplicate Memories — `[Tier 1 finds] → [Tier 2 merges]`

**Tier 1 (server-side):** Find memory clusters whose embeddings exceed a similarity threshold.

1. Select all non-archived memories for the agent (batch by `DREAM_BATCH_SIZE`, default 500).
2. For each memory, find others with cosine similarity >= `DREAM_SIMILARITY_THRESHOLD` (default `0.90`, deliberately higher than the existing `SIMILARITY_THRESHOLD` of `0.85` to avoid false merges).
3. Group overlapping pairs into clusters via union-find.
4. Return clusters via `GET /api/v1/dream/candidates/duplicates` — each cluster includes the memory IDs, contents, and a suggested anchor (highest importance).

**Tier 2 (agent-driven):** For each cluster, the agent decides how to merge:
- Read the cluster members, reason about which content to keep.
- PATCH the anchor memory with merged content, unioned tags, max importance.
- Set `metadata.mergedFrom` with source memory IDs on the anchor.
- Archive the non-anchor memories (soft delete via `archivedAt`).

**Tier 1 fallback (no agent):** If auto-dream is enabled without an agent, server does a mechanical merge: keep the anchor, concatenate unique content from others, union tags, archive duplicates. No LLM needed — just less elegant.

### 2. Summarize Sessions — `[Tier 1 finds] → [Tier 2 summarizes]`

**Tier 1 (server-side):** Find sessions needing summaries.

1. Find all sessions where `endedAt IS NOT NULL` and no linked memory with `category = 'session_summary'` exists.
2. Return via `GET /api/v1/dream/candidates/unsummarized-sessions` with session IDs and memory counts.

**Tier 2 (agent-driven):** For each session:
- Retrieve all memories for that session via existing `GET /api/v1/memory?sessionId=X`.
- Reason about the session's arc: key decisions, facts learned, unresolved questions, outcomes.
- Store summary via `POST /api/v1/memory` with `category: 'session_summary'`, `sessionId` linked, importance `0.7`.
- Optionally, reduce importance of individual session memories (decay by `DREAM_SESSION_DECAY`, default `0.15`).

### 3. Decay & Prune — `[Tier 1 only]`

Fully server-side. No LLM intelligence needed.

1. Select non-archived memories older than `DREAM_DECAY_AGE_DAYS` (default `30`).
2. Apply time-based decay: `new_importance = importance * DREAM_DECAY_FACTOR` (default `0.95` per cycle).
3. Archive any memory where `importance < DREAM_PRUNE_THRESHOLD` (default `0.05`).
4. Exclude memories with `category = 'session_summary'` or tag `pinned` from pruning (summaries and pinned items are protected).

### 4. Consolidate Entities — `[Tier 1 finds] → [Tier 2 decides]`

**Tier 1 (server-side):**
1. Find entity pairs of the same type with name similarity (Levenshtein or embedding cosine >= `DREAM_ENTITY_SIMILARITY`, default `0.92`).
2. Clean up orphaned relations pointing to archived entities (no agent needed).
3. Return entity pairs via `GET /api/v1/dream/candidates/duplicate-entities`.

**Tier 2 (agent-driven):**
- Review each pair, decide: `keep_both`, `merge` (with merged properties), or `archive_one`.
- For merges: use existing PATCH/DELETE endpoints to migrate relations and archive the duplicate.

### 5. Promote Learnings — `[Tier 1 finds] → [Tier 2 promotes]`

**Tier 1 (server-side):** Uses existing `getPromotionCandidates()` logic — already built. Surfaces patterns with recurrenceCount >= 3, sessionCount >= 2, within 30-day window. Available via existing `GET /api/v1/learnings/candidates`.

**Tier 2 (agent-driven):**
- Read each candidate pattern and its linked learnings.
- Synthesize a `best_practice` learning from the pattern.
- Create via `POST /api/v1/learnings` with `category: 'best_practice'`, `status: 'promoted'`.
- Optionally archive source learnings that are fully subsumed.

### 6. Knowledge Graph Enrichment — `[Tier 2 only]`

Fully agent-driven. SwarmRecall provides the data; the agent does the reasoning.

1. Agent reads recent memories (since last dream cycle — tracked via dream cycle timestamps).
2. Agent extracts entity mentions and implied relations from memory content.
3. Agent matches extracted entities to existing entities via `GET /api/v1/knowledge/entities/search`.
4. Agent creates new entities and relations via existing POST endpoints.
5. Agent marks memories as processed via `PATCH /api/v1/memory/:id` setting `metadata.dreamProcessedAt`.

### 7. Contradiction Resolution — `[Tier 2 only]`

Fully agent-driven. An operation unique to LLM-powered dreaming.

1. Agent retrieves memories with high similarity but different content (potential contradictions).
2. Agent reads both memories and their context (session, timestamps, related entities).
3. Agent decides: which is current truth? Is the older one now stale?
4. Agent archives the stale memory, optionally updating the current one with a note about what changed.

---

## Data Model Changes

### New Table: `dream_cycles`

Tracks each dream run for auditability and scheduling.

```sql
CREATE TABLE dream_cycles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID REFERENCES agents(id),        -- NULL for pool-level dreams
  pool_id       UUID REFERENCES pools(id),          -- NULL for agent-level dreams
  owner_id      UUID NOT NULL REFERENCES owners(id),
  status        TEXT NOT NULL DEFAULT 'pending',     -- pending | running | completed | failed
  operations    JSONB NOT NULL DEFAULT '[]',         -- which ops were requested
  results       JSONB,                               -- per-op stats after completion
  trigger       TEXT NOT NULL DEFAULT 'manual',      -- manual | scheduled | api
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dream_cycles_agent_idx ON dream_cycles(agent_id);
CREATE INDEX dream_cycles_owner_idx ON dream_cycles(owner_id);
CREATE INDEX dream_cycles_status_idx ON dream_cycles(status);
```

**Drizzle schema addition** (`packages/api/src/db/schema.ts`):

```typescript
export const dreamCycles = pgTable(
  'dream_cycles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').references(() => agents.id),
    poolId: uuid('pool_id').references(() => pools.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    status: text('status').notNull().default('pending'),
    operations: jsonb('operations').notNull().default([]),
    results: jsonb('results'),
    trigger: text('trigger').notNull().default('manual'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('dream_cycles_agent_idx').on(t.agentId),
    index('dream_cycles_owner_idx').on(t.ownerId),
    index('dream_cycles_status_idx').on(t.status),
  ],
);
```

### New Table: `dream_configs`

Per-agent (or per-pool) dream configuration.

```typescript
export const dreamConfigs = pgTable(
  'dream_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id').references(() => agents.id),
    poolId: uuid('pool_id').references(() => pools.id),
    ownerId: uuid('owner_id').notNull().references(() => owners.id),
    enabled: text('enabled').notNull().default('true'),            // auto-dream on/off
    intervalHours: integer('interval_hours').notNull().default(24), // how often to auto-dream
    operations: jsonb('operations').notNull().default([             // which ops to run
      'deduplicate', 'summarize_sessions', 'decay_prune',
      'consolidate_entities', 'promote_learnings',
    ]),
    thresholds: jsonb('thresholds').notNull().default({}),         // override default thresholds
    lastDreamAt: timestamp('last_dream_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('dream_configs_agent_idx').on(t.agentId),
    index('dream_configs_owner_idx').on(t.ownerId),
  ],
);
```

---

## New Constants (`packages/shared/src/constants.ts`)

```typescript
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
```

---

## New Types (`packages/shared/src/types.ts`)

```typescript
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
  similarityThreshold: number;   // default 0.90
  decayAgeDays: number;          // default 30
  decayFactor: number;           // default 0.95
  pruneThreshold: number;        // default 0.05
  sessionDecay: number;          // default 0.15
  entitySimilarity: number;      // default 0.92
  batchSize: number;             // default 500
}
```

---

## New Zod Schemas (`packages/shared/src/schemas.ts`)

```typescript
// --- Dreaming ---

export const DreamTriggerSchema = z.object({
  operations: z.array(z.enum(DREAM_OPERATIONS)).min(1).optional(),  // defaults to agent's config
  thresholds: z.object({
    similarityThreshold: z.number().min(0.5).max(1).optional(),
    decayAgeDays: z.number().int().min(1).max(365).optional(),
    decayFactor: z.number().min(0).max(1).optional(),
    pruneThreshold: z.number().min(0).max(1).optional(),
    sessionDecay: z.number().min(0).max(1).optional(),
    entitySimilarity: z.number().min(0.5).max(1).optional(),
    batchSize: z.number().int().min(50).max(2000).optional(),
  }).optional(),
  dryRun: z.boolean().default(false),  // preview what would happen without making changes
});

export const DreamConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  intervalHours: z.number().int().min(1).max(168).optional(),  // 1h to 1 week
  operations: z.array(z.enum(DREAM_OPERATIONS)).min(1).optional(),
  thresholds: z.object({
    similarityThreshold: z.number().min(0.5).max(1).optional(),
    decayAgeDays: z.number().int().min(1).max(365).optional(),
    decayFactor: z.number().min(0).max(1).optional(),
    pruneThreshold: z.number().min(0).max(1).optional(),
    sessionDecay: z.number().min(0).max(1).optional(),
    entitySimilarity: z.number().min(0.5).max(1).optional(),
    batchSize: z.number().int().min(50).max(2000).optional(),
  }).optional(),
});

export const DreamListSchema = PaginationSchema.extend({
  status: z.enum(DREAM_STATUSES).optional(),
  agentId: z.string().uuid().optional(),
});
```

---

## API Endpoints

New route file: `packages/api/src/routes/dream.ts`

### Dream Cycle Management (API key auth — `dream.read` / `dream.write`)

| Method | Path | Description | Auth Scope |
|--------|------|-------------|------------|
| `POST` | `/api/v1/dream` | Start a dream cycle (acquires lock) | `dream.write` |
| `GET` | `/api/v1/dream` | List dream cycles | `dream.read` |
| `GET` | `/api/v1/dream/:id` | Get dream cycle details + results | `dream.read` |
| `PATCH` | `/api/v1/dream/:id` | Update cycle (report results, mark complete/failed) | `dream.write` |
| `GET` | `/api/v1/dream/config` | Get dream config for this agent | `dream.read` |
| `PATCH` | `/api/v1/dream/config` | Update dream config | `dream.write` |

### Candidate Primitives — the building blocks agents use to dream

These are the key new endpoints. They return pre-computed analysis that an agent can act on using existing memory/knowledge/learning endpoints.

| Method | Path | Description | Auth Scope |
|--------|------|-------------|------------|
| `GET` | `/api/v1/dream/candidates/duplicates` | Memory clusters above similarity threshold | `dream.read` |
| `GET` | `/api/v1/dream/candidates/unsummarized-sessions` | Completed sessions missing summaries | `dream.read` |
| `GET` | `/api/v1/dream/candidates/duplicate-entities` | Entity pairs that may be duplicates | `dream.read` |
| `GET` | `/api/v1/dream/candidates/stale` | Memories past decay age, with current importance | `dream.read` |
| `GET` | `/api/v1/dream/candidates/contradictions` | Memory pairs with high similarity but divergent content | `dream.read` |
| `GET` | `/api/v1/dream/candidates/unprocessed` | Memories not yet processed for entity extraction | `dream.read` |
| `POST` | `/api/v1/dream/execute` | Run Tier 1 ops server-side (decay, prune, orphan cleanup) | `dream.write` |

#### Example: `GET /api/v1/dream/candidates/duplicates`

```json
{
  "clusters": [
    {
      "anchor": { "id": "mem_1", "content": "User prefers dark mode", "importance": 0.8 },
      "members": [
        { "id": "mem_7", "content": "The user likes dark mode themes", "importance": 0.5, "similarity": 0.94 },
        { "id": "mem_12", "content": "User said they prefer dark mode", "importance": 0.6, "similarity": 0.92 }
      ]
    }
  ],
  "totalClusters": 3,
  "thresholdUsed": 0.90
}
```

#### Example: `GET /api/v1/dream/candidates/contradictions`

```json
{
  "pairs": [
    {
      "memory_a": { "id": "mem_3", "content": "User's timezone is PST", "createdAt": "2026-01-15T..." },
      "memory_b": { "id": "mem_45", "content": "User's timezone is EST", "createdAt": "2026-03-20T..." },
      "similarity": 0.91,
      "contentDivergence": 0.67
    }
  ]
}
```

### Owner-scoped (Firebase auth — dashboard)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/dream/agents/:agentId` | Trigger dream for specific agent |
| `GET` | `/api/v1/dream/agents/:agentId` | List dream cycles for agent |
| `PATCH` | `/api/v1/dream/agents/:agentId/config` | Update agent dream config |
| `POST` | `/api/v1/dream/agents/:agentId/execute` | Run Tier 1 ops for agent from dashboard |

### New API Key Scopes

Add to `API_KEY_SCOPES`:

```typescript
export const API_KEY_SCOPES = [
  'memory.read', 'memory.write',
  'knowledge.read', 'knowledge.write',
  'learnings.read', 'learnings.write',
  'skills.read', 'skills.write',
  'pools.read', 'pools.write',
  'dream.read', 'dream.write',       // <-- new
] as const;
```

---

## Service Layer

New service file: `packages/api/src/services/dream.ts`

### Tier 1 Functions (server-side, no LLM)

```typescript
// --- Candidate Discovery (read-only, used by agent or dashboard) ---

async function findDuplicateClusters(ctx: DreamContext): Promise<DuplicateCluster[]>
// Batch-scans embeddings, returns clusters via union-find grouping

async function findUnsummarizedSessions(ctx: DreamContext): Promise<UnsummarizedSession[]>
// Joins sessions ↔ memories, finds gaps

async function findDuplicateEntities(ctx: DreamContext): Promise<EntityPair[]>
// Name + embedding similarity across same-type entities

async function findStaleMemories(ctx: DreamContext): Promise<StaleMemory[]>
// Memories older than decayAgeDays, returns with current importance

async function findContradictions(ctx: DreamContext): Promise<ContradictionPair[]>
// High embedding similarity + content divergence (TF-IDF or jaccard on tokens)

async function findUnprocessedMemories(ctx: DreamContext): Promise<UnprocessedMemory[]>
// Memories where metadata.dreamProcessedAt is null or before last cycle

// --- Execution (mutating, server-side Tier 1 ops) ---

async function executeTier1(ctx: DreamContext): Promise<Tier1Results>
// Runs: decayAndPrune + orphanCleanup. Optionally: mechanical dedup fallback.

async function decayAndPrune(ctx: DreamContext): Promise<DecayPruneResult>
// Pure math: decay importance, archive below threshold

async function cleanupOrphans(ctx: DreamContext): Promise<OrphanCleanupResult>
// Delete relations pointing to archived entities
```

### Dream Cycle Management

```typescript
async function startDreamCycle(params: {
  agentId?: string;
  poolId?: string;
  ownerId: string;
  operations: DreamOperation[];
  trigger: DreamTrigger;
}): Promise<DreamCycle>
// Creates row, acquires lock (409 if already running), returns cycle ID

async function updateDreamCycle(cycleId: string, update: {
  status?: DreamStatus;
  results?: Partial<DreamResults>;
  error?: string;
}): Promise<DreamCycle>
// Agent calls this to report progress and mark complete/failed

async function getDreamCycle(cycleId: string): Promise<DreamCycle>
async function listDreamCycles(params: DreamListParams): Promise<Paginated<DreamCycle>>
```

### DreamContext

```typescript
interface DreamContext {
  agentId: string | null;
  poolId: string | null;
  ownerId: string;
  thresholds: DreamThresholds;
  cycleId: string;
}
```

### Contradiction Detection Algorithm

This is the most novel primitive. Finding contradictions requires more than just similarity — two memories can be very similar in topic but say opposite things.

```typescript
async function findContradictions(ctx: DreamContext): Promise<ContradictionPair[]> {
  // 1. Find memory pairs with high embedding similarity (>= 0.85)
  // 2. For each pair, compute content divergence:
  //    - Tokenize both contents
  //    - Compute Jaccard distance on token sets
  //    - High similarity + high Jaccard distance = potential contradiction
  // 3. Filter: same category, different sessions (cross-session contradictions)
  // 4. Sort by divergence score descending
  // 5. Return top N pairs for agent review
}
```

---

## No Server-Side LLM (By Design)

SwarmRecall intentionally does **not** run LLM inference for dream operations. The reasons:

1. **Cost ownership** — The agent's owner pays for their own LLM calls, not SwarmRecall's infrastructure budget.
2. **Model choice** — Different agents use different models. The agent knows which model it trusts for reasoning.
3. **Prompt control** — The agent (or its framework) owns its system prompt and reasoning style.
4. **Simplicity** — SwarmRecall stays a pure persistence layer without needing LLM API keys or prompt engineering.

If a future use case demands server-side LLM (e.g., a "fully managed dreaming" premium feature), it can be added as an optional `packages/api/src/lib/llm.ts` provider behind a feature flag. But for v1, the architecture is: **SwarmRecall finds, the agent decides.**

---

## Scheduling / Auto-Dream

### Option A: Internal Cron (Recommended for v1)

Add a lightweight interval check in the API server startup:

```typescript
// packages/api/src/jobs/dreamScheduler.ts

const SCHEDULER_CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 min

async function checkAndRunDueDreams() {
  const dueConfigs = await db.select()
    .from(dreamConfigs)
    .where(and(
      eq(dreamConfigs.enabled, 'true'),
      or(
        isNull(dreamConfigs.lastDreamAt),
        sql`${dreamConfigs.lastDreamAt} + (${dreamConfigs.intervalHours} || ' hours')::interval < NOW()`
      ),
    ));

  for (const config of dueConfigs) {
    // Ensure no already-running cycle for this agent
    const running = await db.select().from(dreamCycles)
      .where(and(
        eq(dreamCycles.agentId, config.agentId),
        eq(dreamCycles.status, 'running'),
      ));

    if (running.length === 0) {
      await executeDreamCycle({
        agentId: config.agentId,
        poolId: config.poolId,
        ownerId: config.ownerId,
        operations: config.operations as DreamOperation[],
        thresholds: { ...DEFAULT_THRESHOLDS, ...config.thresholds },
        trigger: 'scheduled',
      });
    }
  }
}
```

Start on server boot:

```typescript
setInterval(checkAndRunDueDreams, SCHEDULER_CHECK_INTERVAL_MS);
```

### Option B: External Cron (Future)

For production scale, trigger via a `/api/v1/dream/scheduled` webhook endpoint called by Render Cron Jobs, Railway Cron, or a GitHub Action.

---

## SDK Additions (`packages/sdk`)

```typescript
class SwarmRecallClient {
  // ... existing methods ...

  // --- Dream Cycle Management ---
  async startDream(params?: DreamStartParams): Promise<DreamCycle>;
  async updateDream(id: string, update: DreamCycleUpdate): Promise<DreamCycle>;
  async completeDream(id: string, results: DreamResults): Promise<DreamCycle>;
  async failDream(id: string, error: string): Promise<DreamCycle>;
  async getDream(id: string): Promise<DreamCycle>;
  async listDreams(params?: DreamListParams): Promise<Paginated<DreamCycle>>;

  // --- Dream Config ---
  async getDreamConfig(): Promise<DreamConfig>;
  async updateDreamConfig(params: DreamConfigUpdate): Promise<DreamConfig>;

  // --- Candidate Primitives (the building blocks for agent-driven dreaming) ---
  async getDuplicateCandidates(params?: CandidateParams): Promise<DuplicateClusterResponse>;
  async getUnsummarizedSessions(params?: CandidateParams): Promise<UnsummarizedSessionResponse>;
  async getDuplicateEntityCandidates(params?: CandidateParams): Promise<EntityPairResponse>;
  async getStaleCandidates(params?: CandidateParams): Promise<StaleMemoryResponse>;
  async getContradictionCandidates(params?: CandidateParams): Promise<ContradictionPairResponse>;
  async getUnprocessedMemories(params?: CandidateParams): Promise<UnprocessedMemoryResponse>;

  // --- Tier 1 Execution (server-side ops) ---
  async executeTier1(params?: Tier1Params): Promise<Tier1Results>;
}
```

### SDK Dream Helper (Convenience)

For agent frameworks that want a one-call dream loop:

```typescript
// High-level helper that orchestrates the full dream flow
async function dream(client: SwarmRecallClient, options?: {
  llm: (prompt: string) => Promise<string>;  // agent provides its own LLM
  operations?: DreamOperation[];
}): Promise<DreamResults> {
  const cycle = await client.startDream({ operations: options?.operations });

  // Tier 1: server-side ops
  const tier1 = await client.executeTier1();

  // Tier 2: agent-driven ops (if LLM provided)
  if (options?.llm) {
    const duplicates = await client.getDuplicateCandidates();
    for (const cluster of duplicates.clusters) {
      const merged = await options.llm(buildMergePrompt(cluster));
      // ... apply merge via client.updateMemory / client.archiveMemory
    }
    // ... similar for sessions, entities, contradictions
  }

  await client.completeDream(cycle.id, results);
  return results;
}
```

---

## CLI Additions (`packages/cli`)

```bash
swarmrecall dream                    # Trigger a dream cycle
swarmrecall dream --dry-run          # Preview what would happen
swarmrecall dream --ops deduplicate,decay_prune   # Run specific operations
swarmrecall dream status             # Show last dream cycle results
swarmrecall dream config             # Show current dream config
swarmrecall dream config --enable    # Enable auto-dreaming
swarmrecall dream config --interval 12  # Set interval to 12 hours
```

---

## Dashboard UI (`packages/web`)

### Dream Status Panel

Add a "Dream" tab or section to the agent detail page:

- **Last dream**: timestamp, duration, status badge
- **Results summary**: counts per operation (memories merged, pruned, etc.)
- **Trigger button**: "Dream Now" with operation checkboxes
- **Config panel**: enable/disable auto-dream, set interval, select operations, adjust thresholds
- **History table**: list of past dream cycles with expandable results

---

## Implementation Order

Recommended phasing:

### Phase 1 — Primitives (MVP)
1. Add `dream_cycles` and `dream_configs` tables to schema (`pnpm db:push`)
2. Add new constants, types, schemas to `@swarmrecall/shared`
3. Add `dream.read` / `dream.write` API key scopes
4. Implement `packages/api/src/services/dream.ts`:
   - `startDreamCycle()` / `updateDreamCycle()` — cycle lifecycle with locking
   - `decayAndPrune()` — pure math, no LLM
   - `cleanupOrphans()` — relation cleanup
   - `findDuplicateClusters()` — embedding similarity clustering
   - `findUnsummarizedSessions()` — session gap detection
   - `findStaleMemories()` — age-based staleness query
5. Implement `packages/api/src/routes/dream.ts`:
   - Cycle CRUD endpoints
   - All candidate endpoints (`/candidates/*`)
   - Config endpoints
   - `POST /execute` for Tier 1 server-side ops

### Phase 2 — Scheduling + Advanced Primitives
6. Add internal scheduler (`packages/api/src/jobs/dreamScheduler.ts`)
7. Implement `findDuplicateEntities()` — entity pair detection
8. Implement `findContradictions()` — divergence scoring algorithm
9. Implement `findUnprocessedMemories()` — for knowledge graph enrichment
10. Mechanical dedup fallback (server-side merge without LLM for auto-dream)

### Phase 3 — SDK + CLI Integration
11. SDK methods for all dream endpoints (trigger, candidates, config)
12. CLI commands (`swarmrecall dream`, `swarmrecall dream candidates`, etc.)
13. Pool-level dreaming support (candidates across pool-scoped data)

### Phase 4 — Dashboard + Polish
14. Dashboard dream status panel
15. Dashboard dream trigger UI with operation picker
16. Dashboard dream config editor
17. Dream cycle history with expandable results

### Phase 5 — Production Hardening
18. External cron webhook endpoint for Render/Railway
19. Dream cycle timeout handling (mark as failed after 30 min)
20. Metrics and alerting on dream failures
21. Rate limiting on dream triggers (max 1 concurrent per agent, enforced at DB level)
22. Undo endpoint — restore all memories archived by a specific dream cycle

---

## Testing Strategy

### Unit Tests
- Each dream operation in isolation against seeded test data
- Threshold boundary tests (what gets merged vs. kept)
- Dry-run mode returns correct previews without mutations

### Integration Tests
- Full dream cycle end-to-end with test LLM responses mocked
- Verify memories are actually archived, re-embedded, re-indexed
- Verify concurrent dream prevention (409 if already running)
- Scheduler correctly identifies due configs and skips running ones

### Manual QA
- Seed an agent with 100+ redundant memories, run deduplicate, inspect results
- Create 10 sessions with no summaries, run summarize, verify quality
- Run decay over 60-day-old low-importance memories, verify pruning

---

## Environment Variables

```env
# Scheduler (optional, defaults shown)
DREAM_SCHEDULER_ENABLED=true
DREAM_SCHEDULER_CHECK_INTERVAL_MS=300000   # 5 min check interval

# Safety limits
DREAM_CYCLE_TIMEOUT_MS=1800000             # 30 min max cycle duration
DREAM_MAX_CANDIDATES_PER_REQUEST=100       # max clusters/pairs returned per candidate endpoint
```

No LLM API keys needed — SwarmRecall doesn't run LLM inference. The agent brings its own.

---

## ClawHub Skill Updates

Dreaming touches every existing module, so both the new `dream` skill and updates to existing skills are needed.

### New Skill: `skills/dream/SKILL.md`

Create a new standalone skill file following the existing frontmatter + markdown pattern. See the full file below this section.

**Frontmatter:**
```yaml
name: swarmrecall-dream
description: Agent dreaming — memory consolidation, deduplication, pruning, contradiction resolution, and session summarization via the SwarmRecall API. Enables agents to optimize their memory store during idle periods.
metadata:
  openclaw:
    emoji: "\U0001F4A4"
    requires:
      env: [SWARMRECALL_API_KEY]
    primaryEnv: SWARMRECALL_API_KEY
    privacyPolicy: Dream operations read and modify existing agent data on SwarmRecall servers. No new external data is collected. Archived memories are soft-deleted and recoverable.
    dataHandling: All data is transmitted over HTTPS. Dream operations run server-side for Tier 1 (decay, prune, candidate detection) and agent-side for Tier 2 (merge, summarize, resolve). Data remains tenant-isolated.
version: 1.0.0
author: swarmclawai
homepage: https://www.swarmrecall.ai
tags: [dreaming, memory-consolidation, pruning, deduplication, ai-agents, persistence]
```

**Skill body must document:**
1. Auto-registration (same pattern as other skills)
2. Dream cycle lifecycle: start → gather candidates → act on them → complete
3. All candidate endpoints with example responses
4. Tier 1 execute endpoint
5. Config endpoints
6. Behavior section — **this is the most important part** — it tells agents *when* and *how* to dream:
   - On idle / between sessions: start a dream cycle
   - First: run Tier 1 (`POST /execute`) for automatic decay/prune
   - Then: fetch candidates (duplicates, unsummarized sessions, contradictions)
   - For each candidate type: reason about it, then use existing memory/knowledge/learnings endpoints to act
   - Finally: mark the cycle complete with results
7. Example full dream flow (the step-by-step from the Architecture section)

### Update: `skills/swarmrecall/SKILL.md` (master skill)

Add a new **Module 6: Dreaming** section after the existing Module 5 (Pools). This should be a condensed version of the standalone dream skill covering:

- When to use (idle periods, between sessions, scheduled maintenance)
- Key endpoints (cycle management + candidate primitives + execute)
- Behavior guidelines (same as standalone but briefer)
- Link to the standalone dream skill for full details

Add `dreaming` and `consolidation` to the `tags` array in frontmatter.

### Update: `skills/memory/SKILL.md`

Add a new section **"## Dreaming Integration"** at the bottom, before the Shared Pools section (or after it). Content:

```markdown
## Dreaming Integration

Memory is the primary target of dream operations. During a dream cycle:

- **Duplicate clusters**: Groups of similar memories are identified by the dream service.
  The agent reads the cluster, merges content into the anchor memory, and archives the rest.
  Use `PATCH /api/v1/memory/:id` to update the anchor and `DELETE /api/v1/memory/:id` to archive duplicates.
- **Session summaries**: Unsummarized sessions are flagged. The agent reads session memories
  via `GET /api/v1/memory?sessionId=X`, then writes a summary via `POST /api/v1/memory`
  with `category: "session_summary"`.
- **Decay & pruning**: The server automatically reduces importance of old memories and archives
  those below the prune threshold. Memories with `category: "session_summary"` or tag `"pinned"`
  are protected.
- **Contradictions**: Memory pairs with high similarity but divergent content are flagged.
  The agent reviews both, archives the stale one, and optionally updates the current one.

To protect a memory from pruning, add the `"pinned"` tag via:
```
PATCH /api/v1/memory/:id
{ "tags": ["pinned", ...existing_tags] }
```
```

### Update: `skills/knowledge/SKILL.md`

Add a **"## Dreaming Integration"** section:

```markdown
## Dreaming Integration

Knowledge entities and relations are affected by dream operations:

- **Duplicate entities**: Entity pairs of the same type with similar names/embeddings are
  identified. The agent reviews each pair and decides: merge, keep both, or archive one.
  For merges, migrate relations from the archived entity to the survivor before archiving.
- **Orphan cleanup**: Relations pointing to archived entities are automatically removed by
  Tier 1 dream operations (no agent action needed).
- **Knowledge graph enrichment**: During dreaming, the agent can read recent memories and
  extract new entities and relations, creating them via `POST /api/v1/knowledge/entities`
  and `POST /api/v1/knowledge/relations`.
```

### Update: `skills/learnings/SKILL.md`

Add a **"## Dreaming Integration"** section:

```markdown
## Dreaming Integration

Learnings benefit from dream-time promotion:

- **Promotion candidates**: The existing `GET /api/v1/learnings/candidates` endpoint
  surfaces patterns meeting promotion criteria (3+ recurrences, 2+ sessions, within 30 days).
  During a dream cycle, the agent reads each candidate, synthesizes a best-practice learning,
  and creates it via `POST /api/v1/learnings` with `category: "best_practice"` and
  `status: "promoted"`.
- **Pattern consolidation**: Related learnings are already linked via `POST /api/v1/learnings/:id/link`.
  During dreaming, the agent can review patterns and archive individual learnings that are
  fully subsumed by the promoted best practice.
```

### Bump Versions

All updated skills should bump from `1.0.3` → `1.1.0` (minor bump for new feature, non-breaking).
The new dream skill starts at `1.0.0`.

---

## Open Questions

1. **Pool-level dreaming** — Should pool dreams run across all members' contributed data, or only pool-scoped items? Probably pool-scoped only.
2. **Undo/rollback** — Since we soft-delete, a "restore last dream" endpoint could un-archive everything from a specific cycle. Should tag archived memories with `metadata.archivedByDreamCycle` to make this possible. Worth building in phase 2?
3. **Webhooks** — Notify agents when a scheduled Tier 1 dream completes? Could be useful for agents that want to "wake up" and run Tier 2 on the results.
4. **Embedding refresh** — Should we periodically re-embed old memories when the embedding model changes? Could be a Tier 1 dream operation.
5. **Candidate pagination** — For agents with 50k+ memories, candidate endpoints need cursor-based pagination. How to handle cluster pagination when clusters can span pages?
6. **Content divergence algorithm** — The contradiction detection uses Jaccard distance on tokens as a v1 heuristic. Should we invest in something more sophisticated (e.g., entailment scoring via a lightweight model)?
7. **Dream cycle ownership** — When an agent starts a cycle, can the dashboard also view/manage it? Probably yes — owner can always see their agent's data. But can the dashboard *cancel* a running agent-driven cycle?
