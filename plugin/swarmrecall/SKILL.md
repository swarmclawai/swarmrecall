# SwarmRecall

Persistent memory, knowledge graphs, learnings, and skill tracking for AI agents via the SwarmRecall API.

## Auto-Registration

Before making any API calls, check for a `SWARMRECALL_API_KEY` environment variable:

1. If `SWARMRECALL_API_KEY` is set, use it for all requests as a Bearer token.
2. If `SWARMRECALL_API_KEY` is not set, self-register by calling:
   ```
   POST https://api.swarmrecall.ai/api/v1/register
   Content-Type: application/json

   { "name": "<your-agent-name>" }
   ```
3. The response returns `{ "apiKey": "...", "claimToken": "..." }`. Save the `apiKey` as `SWARMRECALL_API_KEY` for all subsequent requests.
4. Tell the user: "SwarmRecall is set up! To manage your agent's data, visit swarmrecall.ai/claim with code: `<claimToken>`"

## Authentication

All API requests require a Bearer token in the Authorization header:
```
Authorization: Bearer <SWARMRECALL_API_KEY>
```

## API Base URL

`https://api.swarmrecall.ai` (override with `SWARMRECALL_API_URL` if set)

All endpoints below are prefixed with `/api/v1`.

---

## Module 1: Memory

Conversational memory persistence with semantic search and session tracking.

### When to use

- Storing user preferences, facts, decisions, and context
- Recalling relevant information from past interactions
- Managing conversation sessions

### Endpoints

#### Store a memory
```
POST /api/v1/memory
{
  "content": "User prefers dark mode",
  "category": "preference",   // fact | preference | decision | context | session_summary
  "importance": 0.8,           // 0.0 to 1.0
  "tags": ["ui", "settings"],
  "metadata": {}
}
```

#### Search memories
```
GET /api/v1/memory/search?q=<query>&limit=10&minScore=0.5
```

#### List memories
```
GET /api/v1/memory?category=preference&limit=20&offset=0&includeArchived=false
```

#### Get a memory
```
GET /api/v1/memory/:id
```

#### Update a memory
```
PATCH /api/v1/memory/:id
{ "importance": 0.9, "tags": ["updated"], "archived": false }
```

#### Delete a memory
```
DELETE /api/v1/memory/:id
```

#### Start a session
```
POST /api/v1/memory/sessions
{ "context": {} }
```

#### Get current session
```
GET /api/v1/memory/sessions/current
```

#### Update a session
```
PATCH /api/v1/memory/sessions/:id
{ "summary": "Discussed project setup", "ended": true }
```

#### List sessions
```
GET /api/v1/memory/sessions?limit=20&offset=0
```

### Behavior

- On session start: call `GET /api/v1/memory/sessions/current` to load context from the last session. If none, call `POST /api/v1/memory/sessions` to start one.
- On fact, preference, or decision: call `POST /api/v1/memory` with appropriate category and importance.
- On recall needed: call `GET /api/v1/memory/search?q=<query>` and use returned memories to inform your response.
- On session end: call `PATCH /api/v1/memory/sessions/:id` with `ended: true` and a summary.

---

## Module 2: Knowledge

Knowledge graph with entities, relations, traversal, and semantic search.

### When to use

- Storing structured information about people, projects, tools, and concepts
- Linking related entities together
- Exploring connections between concepts

### Endpoints

#### Create an entity
```
POST /api/v1/knowledge/entities
{
  "type": "person",
  "name": "Alice",
  "properties": { "role": "engineer" }
}
```

#### Get an entity
```
GET /api/v1/knowledge/entities/:id
```

#### List entities
```
GET /api/v1/knowledge/entities?type=person&limit=20&offset=0&includeArchived=false
```

#### Update an entity
```
PATCH /api/v1/knowledge/entities/:id
{ "name": "Alice Smith", "properties": { "role": "senior engineer" } }
```

#### Delete an entity
```
DELETE /api/v1/knowledge/entities/:id
```

#### Create a relation
```
POST /api/v1/knowledge/relations
{
  "fromEntityId": "<id>",
  "toEntityId": "<id>",
  "relation": "works_on",
  "properties": {}
}
```

#### List relations
```
GET /api/v1/knowledge/relations?entityId=<id>&relation=works_on&limit=20&offset=0
```

#### Delete a relation
```
DELETE /api/v1/knowledge/relations/:id
```

#### Traverse the graph
```
GET /api/v1/knowledge/traverse?startId=<id>&relation=works_on&depth=2&limit=50
```

#### Search entities
```
GET /api/v1/knowledge/search?q=<query>&limit=10&minScore=0.5
```

#### Validate the graph
```
POST /api/v1/knowledge/validate
```

### Behavior

- When the user provides structured information: create entities with `POST /api/v1/knowledge/entities`.
- When linking concepts: create relations with `POST /api/v1/knowledge/relations`.
- When the user asks "what do I know about X?": search with `GET /api/v1/knowledge/search?q=X`, then traverse with `GET /api/v1/knowledge/traverse` to explore connections.
- Periodically: call `POST /api/v1/knowledge/validate` to check graph constraints.

---

## Module 3: Learnings

Error tracking, correction logging, and pattern detection that surfaces recurring issues.

### When to use

- Logging errors, corrections, and discoveries
- Detecting recurring patterns across sessions
- Promoting learnings into actionable rules

### Endpoints

#### Log a learning
```
POST /api/v1/learnings
{
  "category": "error",        // error | correction | discovery | optimization | preference
  "summary": "npm install fails with peer deps",
  "details": "Full error output...",
  "priority": "high",         // low | medium | high | critical
  "area": "build",
  "suggestedAction": "Use --legacy-peer-deps flag",
  "tags": ["npm", "build"],
  "metadata": {}
}
```

#### Search learnings
```
GET /api/v1/learnings/search?q=<query>&limit=10&minScore=0.5
```

#### Get a learning
```
GET /api/v1/learnings/:id
```

#### List learnings
```
GET /api/v1/learnings?category=error&status=open&priority=high&area=build&limit=20&offset=0
```

#### Update a learning
```
PATCH /api/v1/learnings/:id
{ "status": "resolved", "resolution": "Added --legacy-peer-deps", "resolutionCommit": "abc123" }
```

#### Get recurring patterns
```
GET /api/v1/learnings/patterns
```

#### Get promotion candidates
```
GET /api/v1/learnings/promotions
```

#### Link related learnings
```
POST /api/v1/learnings/:id/link
{ "targetId": "<other-learning-id>" }
```

### Behavior

- On error: call `POST /api/v1/learnings` with `category: "error"`, the summary, details, and the command/output that failed.
- On correction: call `POST /api/v1/learnings` with `category: "correction"` and what was wrong vs. what is correct.
- On session start: call `GET /api/v1/learnings/patterns` to preload known recurring issues. Check `GET /api/v1/learnings/promotions` for patterns ready to be promoted.
- On promotion candidates: surface candidates to the user for approval before acting on them.

---

## Module 4: Skills

Skill registry for tracking installed agent capabilities and getting contextual suggestions.

### When to use

- Registering new capabilities your agent acquires
- Listing what the agent can do
- Getting skill recommendations for a given task

### Endpoints

#### Register a skill
```
POST /api/v1/skills
{
  "name": "code-review",
  "version": "1.0.0",
  "source": "clawhub/code-review",
  "description": "Automated code review with inline suggestions",
  "triggers": ["review", "PR"],
  "dependencies": ["git"],
  "config": {}
}
```

#### List skills
```
GET /api/v1/skills?status=active&limit=20&offset=0
```

#### Get a skill
```
GET /api/v1/skills/:id
```

#### Update a skill
```
PATCH /api/v1/skills/:id
{ "version": "1.1.0", "config": {}, "status": "active" }
```

#### Remove a skill
```
DELETE /api/v1/skills/:id
```

#### Get skill suggestions
```
GET /api/v1/skills/suggest?context=<task-description>&limit=5
```

### Behavior

- On skill install: call `POST /api/v1/skills` to register the skill with name, version, and source.
- On "what can I do?": call `GET /api/v1/skills` to list installed capabilities.
- On task context: call `GET /api/v1/skills/suggest?context=<description>` for relevant skill recommendations.

---

## Module 5: Shared Pools

Named shared data containers for cross-agent collaboration.

### Endpoints

#### List pools
```
GET /api/v1/pools
```

#### Get pool details
```
GET /api/v1/pools/:id
```

### Behavior

- To share data across agents, include `"poolId": "<uuid>"` in any create request for memory, knowledge, learnings, or skills.
- The agent must have the appropriate access level for the pool and module.
- Call `GET /api/v1/pools` on session start to see available pools.

---

## Module 6: Dreaming

Background memory consolidation — deduplication, pruning, and session summarization.

### Endpoints

#### Dream cycle management
```
POST /api/v1/dream              — Start a dream cycle
GET  /api/v1/dream              — List dream cycles
PATCH /api/v1/dream/:id         — Update cycle (report results, complete/fail)
GET  /api/v1/dream/config       — Get dream config
PATCH /api/v1/dream/config      — Update dream config
POST /api/v1/dream/execute      — Run server-side ops (decay, prune)
```

#### Candidate primitives
```
GET /api/v1/dream/candidates/duplicates
GET /api/v1/dream/candidates/unsummarized-sessions
GET /api/v1/dream/candidates/stale
GET /api/v1/dream/candidates/contradictions
```

### Behavior

1. Start a dream cycle: `POST /api/v1/dream`
2. Run server-side ops: `POST /api/v1/dream/execute`
3. Fetch candidates, reason about them, act using existing endpoints
4. Complete the cycle: `PATCH /api/v1/dream/:cycleId` with results
