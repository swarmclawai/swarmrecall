# @swarmrecall/shared

Shared types, Zod schemas, and constants for the SwarmRecall ecosystem.

## Install

```bash
npm install @swarmrecall/shared
```

## What's Included

### Types

TypeScript interfaces for all SwarmRecall data models:

- `Owner`, `Agent`, `ApiKey` — Core identity
- `Memory`, `MemorySession` — Episodic memory
- `Entity`, `Relation`, `EntityType` — Knowledge graph
- `Learning`, `LearningPattern` — Error tracking and pattern detection
- `AgentSkill`, `SkillOverride` — Skill registry
- `Pool`, `PoolMember` — Shared data pools for cross-agent collaboration

### Schemas

Zod validation schemas for all API request bodies:

- `MemoryCreateSchema`, `EntityCreateSchema`, `LearningCreateSchema`, `SkillRegisterSchema`
- `PoolCreateSchema`, `PoolMemberAddSchema`
- Pagination, search, and filter schemas

### Constants

- `MEMORY_CATEGORIES` — fact, preference, decision, context, session_summary
- `ENTITY_TYPES` — Person, Organization, Project, Task, Goal, etc.
- `LEARNING_CATEGORIES` — correction, insight, knowledge_gap, best_practice, error, feature_request
- `API_KEY_SCOPES` — memory, knowledge, learnings, skills, pools (read/write)
- `POOL_ACCESS_LEVELS` — none, read, readwrite

## Usage

```typescript
import {
  type Memory,
  type Pool,
  MemoryCreateSchema,
  MEMORY_CATEGORIES,
  API_KEY_SCOPES,
} from '@swarmrecall/shared';
```

## License

MIT
