# Shared Pools — Cross-Agent Data Sharing

## Context

SwarmRecall currently enforces strict per-agent data isolation. Every query filters by `agentId + ownerId`, meaning agents under the same owner cannot see each other's memories, knowledge, learnings, or skills. Users have asked for a way to let agents collaborate — sharing and co-creating data when the owner permits it.

This design introduces **Shared Pools**: named containers that multiple agents can join, with per-data-type read/write permissions. Data contributed to a pool belongs to the pool, not any single agent.

## Scope

- Same-owner only (cross-owner sharing is out of scope)
- Owner manages pools and membership via dashboard
- Agents access pool data through existing API endpoints (merged results)
- Per data type access control: `none`, `read`, `readwrite`
- Merged query results tagged with source (`own` vs pool name)

## Data Model

### New Tables

#### `pools`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `defaultRandom()` |
| ownerId | uuid FK→owners | Tenant isolation |
| name | text NOT NULL | e.g., "Research Team" |
| description | text | Optional |
| archivedAt | timestamp | Soft delete |
| createdAt | timestamp NOT NULL | `defaultNow()` |
| updatedAt | timestamp NOT NULL | `defaultNow()` |

Indexes: `pools_owner_idx` on (ownerId)

#### `poolMembers`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `defaultRandom()` |
| poolId | uuid FK→pools NOT NULL | |
| agentId | uuid FK→agents NOT NULL | |
| ownerId | uuid FK→owners NOT NULL | Denormalized for query perf |
| memoryAccess | text NOT NULL | `none` / `read` / `readwrite`, default `none` |
| knowledgeAccess | text NOT NULL | `none` / `read` / `readwrite`, default `none` |
| learningsAccess | text NOT NULL | `none` / `read` / `readwrite`, default `none` |
| skillsAccess | text NOT NULL | `none` / `read` / `readwrite`, default `none` |
| joinedAt | timestamp NOT NULL | `defaultNow()` |

Indexes: `pool_members_pool_idx` on (poolId), `pool_members_agent_idx` on (agentId), `pool_members_owner_idx` on (ownerId)
Unique constraint: (poolId, agentId)

### Modified Tables

Add nullable `poolId` (uuid FK→pools) column to:
- `memories`
- `memorySessions`
- `entities`
- `relations`
- `learnings`
- `learningPatterns`
- `agentSkills`

Add index `<table>_pool_idx` on (poolId) for each.

When `poolId` is set → record belongs to the pool (shared ownership). The `agentId` field is retained as the **creator** for attribution, but access is governed by pool membership, not agent ID.
When `poolId` is null → agent's private data (current behavior, no change).

### Query Pattern Change

**Before:**
```sql
WHERE agent_id = :agentId AND owner_id = :ownerId
```

**After:**
```sql
WHERE owner_id = :ownerId
  AND (agent_id = :agentId OR pool_id IN (:readablePoolIds))
```

Where `readablePoolIds` is resolved from `poolMembers` for the requesting agent with `read` or `readwrite` access on the relevant data type.

## API Design

### New Scopes

Add to `API_KEY_SCOPES`:
- `pools.read` — list pools, view membership
- `pools.write` — create data in pools (respects member access level)

### New Routes — Dashboard (`/pools`)

All require `firebaseAuth`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/pools` | Create a pool |
| GET | `/pools` | List owner's pools |
| GET | `/pools/:id` | Get pool details + members |
| PATCH | `/pools/:id` | Update pool name/description |
| DELETE | `/pools/:id` | Archive pool (soft delete) |
| POST | `/pools/:id/members` | Add agent with access levels |
| PATCH | `/pools/:id/members/:agentId` | Update member access levels |
| DELETE | `/pools/:id/members/:agentId` | Remove agent from pool |

### New Routes — Agent API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pools` | List pools this agent belongs to (requires `pools.read`) |
| GET | `/pools/:id` | Get pool details if agent is a member (requires `pools.read`) |

### Modified Routes — Agent API

All existing list/search endpoints automatically include pool data:
- `GET /memory`, `GET /memory/search` — include memories from readable pools
- `GET /knowledge/entities`, `GET /knowledge/entities/search` — include entities from readable pools
- `GET /learnings`, `GET /learnings/search` — include learnings from readable pools
- `GET /skills` — include skills from readable pools

All existing create endpoints accept optional `poolId` body param:
- `POST /memory` — if `poolId` provided, memory belongs to pool (requires `readwrite` on memory)
- `POST /knowledge/entities` — if `poolId` provided, entity belongs to pool
- `POST /learnings` — if `poolId` provided, learning belongs to pool
- `POST /skills` — if `poolId` provided, skill belongs to pool

All existing update/delete endpoints check pool access:
- If record has `poolId`, agent must have `readwrite` access to that pool for the relevant data type

### Response Shape Changes

All data records gain optional fields:
```typescript
poolId?: string;      // set when record belongs to a pool
poolName?: string;    // resolved pool name for display
```

## Service Layer

### New Services

**`packages/api/src/services/pools.ts`**
- `createPool(ownerId, data)` → pool record
- `listPools(ownerId)` → pool list
- `getPool(id, ownerId)` → pool + members
- `updatePool(id, ownerId, data)` → updated pool
- `archivePool(id, ownerId)` → soft delete
- `addPoolMember(poolId, agentId, ownerId, accessLevels)` → member record
- `updatePoolMember(poolId, agentId, ownerId, accessLevels)` → updated member
- `removePoolMember(poolId, agentId, ownerId)` → void
- `getAgentPools(agentId, ownerId)` → pools this agent belongs to

**`packages/api/src/services/poolAccess.ts`**
- `getReadablePoolIds(agentId, ownerId, dataType)` → uuid[] of pools with `read` or `readwrite`
- `getWritablePoolIds(agentId, ownerId, dataType)` → uuid[] of pools with `readwrite`
- `validatePoolWrite(agentId, ownerId, poolId, dataType)` → throws if not allowed
- Results cached per-request to avoid repeated DB lookups

### Modified Services

**`memory.ts`**, **`knowledge.ts`**, **`learnings.ts`**, **`skills.ts`**:
- List/search functions: expand WHERE clause to include `OR poolId IN (:readablePoolIds)`
- Create functions: accept optional `poolId`, validate write access, set on record
- Update/delete functions: check pool write access if record has `poolId`
- All pool data in responses includes `poolName` resolved via join or lookup

### Audit Events

New event types:
- `pool.created`, `pool.updated`, `pool.archived`
- `pool.member.added`, `pool.member.updated`, `pool.member.removed`
- Existing events (`memory.created`, etc.) gain `poolId` in payload when applicable

## Shared Package Changes

### New Types (`packages/shared/src/types.ts`)

```typescript
interface Pool {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PoolMember {
  id: string;
  poolId: string;
  agentId: string;
  ownerId: string;
  memoryAccess: 'none' | 'read' | 'readwrite';
  knowledgeAccess: 'none' | 'read' | 'readwrite';
  learningsAccess: 'none' | 'read' | 'readwrite';
  skillsAccess: 'none' | 'read' | 'readwrite';
  joinedAt: string;
}

type PoolAccessLevel = 'none' | 'read' | 'readwrite';
```

### New Schemas (`packages/shared/src/schemas.ts`)

- `createPoolSchema` — name (required), description (optional)
- `updatePoolSchema` — name, description (both optional)
- `addPoolMemberSchema` — agentId, memoryAccess, knowledgeAccess, learningsAccess, skillsAccess
- `updatePoolMemberSchema` — access levels (all optional)

### Modified Types

Add to `Memory`, `Entity`, `Relation`, `Learning`, `LearningPattern`, `AgentSkill`:
```typescript
poolId?: string;
poolName?: string;
```

### Constants

Add to `API_KEY_SCOPES`: `'pools.read'`, `'pools.write'`

Add `POOL_ACCESS_LEVELS = ['none', 'read', 'readwrite'] as const`

## SDK Changes (`packages/sdk`)

### New Operations

```typescript
class PoolOperations {
  list(): Promise<Pool[]>
  get(poolId: string): Promise<Pool & { members: PoolMember[] }>
}
```

Accessed via `client.pools`.

### Modified Operations

All create methods gain optional `poolId` param:
```typescript
client.memory.store(content, { category, poolId })
client.knowledge.entities.create({ type, name, poolId })
client.learnings.log({ category, summary, poolId })
client.skills.register({ name, poolId })
```

All response types updated to include `poolId?` and `poolName?`.

### Publishing

Bump SDK version (minor) and publish to npm.

## CLI Changes (`packages/cli`)

New command group:
```
swarmrecall pools list              # List pools this agent belongs to
swarmrecall pools show <poolId>     # Show pool details and access levels
```

Modified commands — add `--pool <poolId>` flag:
```
swarmrecall memory store "content" --pool <poolId>
swarmrecall knowledge create --pool <poolId> ...
swarmrecall learnings log --pool <poolId> ...
```

## Dashboard Changes (`packages/web`)

### New Pages

- `/pools` — List and create pools (owner view)
- `/pools/:id` — Pool detail: name, description, member list with access levels, pool data browser

### Modified Pages

- Agent detail: new "Pools" tab showing which pools the agent belongs to
- Memory/Knowledge/Learnings views: pool data visually tagged with pool name badge
- Settings: link to pool management

## Skills (`skills/`)

### Modified Skills

Update `SKILL.md` in `memory/`, `knowledge/`, `learnings/`, `skills/`:
- Document `poolId` parameter on create endpoints
- Document that search/list results now include pool data
- Document `poolId`/`poolName` fields in responses

### New Skill

`skills/pools/SKILL.md` — Pool operations skill for ClawHub:
- List pools, show pool details
- Guide agents on how to write to pools

### Publishing

All updated skills published to ClawHub.

## Documentation

- API reference: new endpoints, modified request/response shapes
- SDK guide: pool usage examples
- "Shared Pools" concept guide: what pools are, how to use them, access model
- CLI reference: new commands and flags

## Verification Plan

1. **Schema**: Run `pnpm db:push`, verify new tables and columns created
2. **Pool CRUD**: Create pool via dashboard API, verify list/get/update/archive
3. **Member management**: Add/update/remove agents from pool, verify access levels
4. **Pool writes**: Agent creates memory with `poolId`, verify it's stored with pool ownership
5. **Merged reads**: Agent A searches memories, verify results include pool data from Agent B's contributions
6. **Access control**: Agent with `read` access cannot write to pool; agent with `none` cannot see pool data
7. **Same-owner enforcement**: Verify cannot add agent from different owner to pool
8. **SDK**: Run SDK against all new/modified endpoints
9. **CLI**: Test `pools list`, `pools show`, `--pool` flag on create commands
10. **Dashboard**: Visual check of pool pages, member management, data tagging
11. **Skills**: Verify updated skill files document new parameters
12. **Audit**: Verify pool events logged correctly
