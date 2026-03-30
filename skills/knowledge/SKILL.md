# SwarmRecall Knowledge

Hosted knowledge graph persistence via the SwarmRecall API.

## Setup

Requires `SWARMRECALL_API_KEY` environment variable.

## Behavior

### When user says "remember that..." or provides structured info
- Call `POST /v1/knowledge/entities` to create an entity with type, name, and properties.

### When linking concepts
- Call `POST /v1/knowledge/relations` with fromEntityId, toEntityId, and relation.

### When user asks "what do I know about X?"
- Call `GET /v1/knowledge/search?q=X` for semantic search over entities.
- Call `GET /v1/knowledge/traverse?startId=<id>&depth=2` to explore connected entities.

### Periodic validation
- Call `POST /v1/knowledge/validate` to check graph constraints.

## API Base URL

`https://api.swarmrecall.ai` (or `SWARMRECALL_API_URL` if set)
