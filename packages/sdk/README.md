# SwarmRecall SDK

TypeScript SDK for the [SwarmRecall](https://swarmrecall.ai) API. Persistent memory, knowledge graphs, learnings, and skill tracking for AI agents.

## Installation

```bash
npm install @swarmrecall/sdk
```

## Quick Start

### Auto-Registration (no account needed)

```typescript
import { SwarmRecallClient } from '@swarmrecall/sdk';

// Self-register to get an API key instantly
const { apiKey, claimToken } = await SwarmRecallClient.register({ name: 'my-agent' });
console.log(`Claim your dashboard: swarmrecall.ai/claim code: ${claimToken}`);

// Use the client
const client = new SwarmRecallClient({ apiKey });
await client.memory.store({ content: 'User prefers dark mode', category: 'preference' });
```

### With an Existing API Key

```typescript
import { SwarmRecallClient } from '@swarmrecall/sdk';

const client = new SwarmRecallClient({
  apiKey: process.env.SWARMRECALL_API_KEY!,
});
```

## API Reference

### `SwarmRecallClient.register(options?)`

Static method. Registers a new agent and returns credentials. No account required.

```typescript
const result = await SwarmRecallClient.register({
  name: 'my-agent',       // optional: agent display name
  baseUrl: 'https://...',  // optional: override API base URL
});
// result: { apiKey: string, claimToken: string }
```

### `new SwarmRecallClient(options)`

Creates a client instance.

```typescript
const client = new SwarmRecallClient({
  apiKey: 'sr_...',                             // required
  baseUrl: 'https://swarmrecall-api.onrender.com', // optional, this is the default
});
```

---

### Memory

Store and retrieve conversational memories with semantic search.

#### `client.memory.store(params)`

```typescript
await client.memory.store({
  content: 'User prefers TypeScript over JavaScript',
  category: 'preference',    // 'fact' | 'preference' | 'decision' | 'context' | 'session_summary'
  importance: 0.8,           // 0.0 to 1.0
  tags: ['language'],
  metadata: {},
  sessionId: '...',          // optional: associate with a session
});
```

#### `client.memory.search(query, options?)`

```typescript
const results = await client.memory.search('typescript', {
  limit: 10,
  minScore: 0.5,
});
```

#### `client.memory.get(id)`

```typescript
const memory = await client.memory.get('mem_abc123');
```

#### `client.memory.list(params?)`

```typescript
const memories = await client.memory.list({
  category: 'preference',
  sessionId: '...',
  limit: 20,
  offset: 0,
  includeArchived: false,
});
```

#### `client.memory.update(id, params)`

```typescript
await client.memory.update('mem_abc123', {
  importance: 0.9,
  tags: ['updated'],
  archived: false,
});
```

#### `client.memory.delete(id)`

```typescript
await client.memory.delete('mem_abc123');
```

#### Sessions

```typescript
// Start a new session
await client.memory.sessions.start({ context: { project: 'my-app' } });

// Get the current active session
const session = await client.memory.sessions.current();

// End a session with a summary
await client.memory.sessions.update(session.id, {
  summary: 'Discussed deployment strategy',
  ended: true,
});

// List past sessions
const sessions = await client.memory.sessions.list({ limit: 10 });
```

---

### Knowledge

Build and query a knowledge graph of entities and relations.

#### `client.knowledge.entities.create(params)`

```typescript
await client.knowledge.entities.create({
  type: 'person',
  name: 'Alice',
  properties: { role: 'engineer', team: 'platform' },
});
```

#### `client.knowledge.entities.get(id)`

```typescript
const entity = await client.knowledge.entities.get('ent_abc123');
```

#### `client.knowledge.entities.list(params?)`

```typescript
const entities = await client.knowledge.entities.list({
  type: 'person',
  limit: 20,
  includeArchived: false,
});
```

#### `client.knowledge.entities.update(id, params)`

```typescript
await client.knowledge.entities.update('ent_abc123', {
  properties: { role: 'senior engineer' },
});
```

#### `client.knowledge.entities.delete(id)`

```typescript
await client.knowledge.entities.delete('ent_abc123');
```

#### `client.knowledge.relations.create(params)`

```typescript
await client.knowledge.relations.create({
  fromEntityId: 'ent_abc',
  toEntityId: 'ent_def',
  relation: 'works_on',
  properties: { since: '2024' },
});
```

#### `client.knowledge.relations.list(params?)`

```typescript
const relations = await client.knowledge.relations.list({
  entityId: 'ent_abc',
  relation: 'works_on',
});
```

#### `client.knowledge.relations.delete(id)`

```typescript
await client.knowledge.relations.delete('rel_abc123');
```

#### `client.knowledge.traverse(params)`

```typescript
const graph = await client.knowledge.traverse({
  startId: 'ent_abc',
  relation: 'works_on',
  depth: 2,
  limit: 50,
});
```

#### `client.knowledge.search(query, options?)`

```typescript
const results = await client.knowledge.search('alice engineer', {
  limit: 10,
  minScore: 0.5,
});
```

#### `client.knowledge.validate()`

```typescript
const report = await client.knowledge.validate();
```

---

### Learnings

Track errors, corrections, and discoveries with automatic pattern detection.

#### `client.learnings.log(params)`

```typescript
await client.learnings.log({
  category: 'error',           // 'error' | 'correction' | 'discovery' | 'optimization' | 'preference'
  summary: 'npm install fails with peer deps',
  details: 'Full error output...',
  priority: 'high',            // 'low' | 'medium' | 'high' | 'critical'
  area: 'build',
  suggestedAction: 'Use --legacy-peer-deps',
  tags: ['npm'],
});
```

#### `client.learnings.search(query, options?)`

```typescript
const results = await client.learnings.search('npm peer deps', { limit: 5 });
```

#### `client.learnings.get(id)`

```typescript
const learning = await client.learnings.get('lrn_abc123');
```

#### `client.learnings.list(params?)`

```typescript
const learnings = await client.learnings.list({
  category: 'error',
  status: 'open',
  priority: 'high',
  area: 'build',
  limit: 20,
});
```

#### `client.learnings.update(id, params)`

```typescript
await client.learnings.update('lrn_abc123', {
  status: 'resolved',
  resolution: 'Added --legacy-peer-deps to install script',
  resolutionCommit: 'abc123',
});
```

#### `client.learnings.resolve(id, params)`

Convenience method to mark a learning as resolved.

```typescript
await client.learnings.resolve('lrn_abc123', {
  resolution: 'Fixed the build script',
  commit: 'abc123',
});
```

#### `client.learnings.patterns()`

```typescript
const patterns = await client.learnings.patterns();
```

#### `client.learnings.promotions()`

```typescript
const candidates = await client.learnings.promotions();
```

#### `client.learnings.link(id, targetId)`

```typescript
await client.learnings.link('lrn_abc', 'lrn_def');
```

---

### Skills

Registry for tracking agent capabilities with contextual suggestions.

#### `client.skills.register(params)`

```typescript
await client.skills.register({
  name: 'code-review',
  version: '1.0.0',
  source: 'clawhub/code-review',
  description: 'Automated code review',
  triggers: ['review', 'PR'],
  dependencies: ['git'],
  config: {},
});
```

#### `client.skills.list(params?)`

```typescript
const skills = await client.skills.list({ status: 'active', limit: 20 });
```

#### `client.skills.get(id)`

```typescript
const skill = await client.skills.get('skl_abc123');
```

#### `client.skills.update(id, params)`

```typescript
await client.skills.update('skl_abc123', {
  version: '1.1.0',
  config: { autoFix: true },
  status: 'active',
});
```

#### `client.skills.remove(id)`

```typescript
await client.skills.remove('skl_abc123');
```

#### `client.skills.suggest(context, limit?)`

```typescript
const suggestions = await client.skills.suggest('reviewing a pull request', 5);
```

---

### Pools

Query shared data pools this agent belongs to. Pool management is done via the dashboard.

#### `client.pools.list()`

```typescript
const pools = await client.pools.list();
```

#### `client.pools.get(poolId)`

```typescript
const pool = await client.pools.get('pool_abc123');
// Returns pool info + members with access levels
```

#### Writing to a Pool

Any create method accepts an optional `poolId` to write data into a shared pool:

```typescript
// Store a memory in a shared pool
await client.memory.store({
  content: 'Shared team knowledge',
  category: 'fact',
  poolId: 'pool_abc123',
});

// Create an entity in a shared pool
await client.knowledge.entities.create({
  type: 'Project',
  name: 'Shared Project',
  poolId: 'pool_abc123',
});
```

Pool data automatically appears in search and list results for all pool members with read access.

---

## Error Handling

All API errors are thrown as typed exceptions:

```typescript
import {
  SwarmRecallError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
} from '@swarmrecall/sdk';

try {
  await client.memory.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Memory not found');
  } else if (err instanceof RateLimitError) {
    console.log('Slow down, retrying...');
  } else if (err instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (err instanceof SwarmRecallError) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
  }
}
```

| Error Class           | HTTP Status | When                        |
|-----------------------|-------------|-----------------------------|
| `ValidationError`     | 400         | Invalid request parameters  |
| `AuthenticationError` | 401         | Missing or invalid API key  |
| `AuthorizationError`  | 403         | Insufficient permissions    |
| `NotFoundError`       | 404         | Resource does not exist     |
| `RateLimitError`      | 429         | Too many requests           |
| `SwarmRecallError`    | Other       | Any other API error         |

## Links

- [SwarmRecall Dashboard](https://swarmrecall.ai)
- [API Documentation](https://docs.swarmrecall.ai)
- [SwarmRecall on ClawHub](https://clawhub.ai/waydelyle/swarmrecall)
- [GitHub](https://github.com/swarmrecall/swarmrecall)

## License

MIT
