# SwarmRecall Knowledge

Knowledge graph with entities, relations, traversal, and semantic search via the SwarmRecall API.

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

All API requests require:
```
Authorization: Bearer <SWARMRECALL_API_KEY>
```

## API Base URL

`https://api.swarmrecall.ai` (override with `SWARMRECALL_API_URL` if set)

All endpoints below are prefixed with `/api/v1`.

## Endpoints

### Create an entity
```
POST /api/v1/knowledge/entities
{
  "type": "person",
  "name": "Alice",
  "properties": { "role": "engineer" }
}
```

### Get an entity
```
GET /api/v1/knowledge/entities/:id
```

### List entities
```
GET /api/v1/knowledge/entities?type=person&limit=20&offset=0&includeArchived=false
```

### Update an entity
```
PATCH /api/v1/knowledge/entities/:id
{ "name": "Alice Smith", "properties": { "role": "senior engineer" } }
```

### Delete an entity
```
DELETE /api/v1/knowledge/entities/:id
```

### Create a relation
```
POST /api/v1/knowledge/relations
{
  "fromEntityId": "<id>",
  "toEntityId": "<id>",
  "relation": "works_on",
  "properties": {}
}
```

### List relations
```
GET /api/v1/knowledge/relations?entityId=<id>&relation=works_on&limit=20&offset=0
```

### Delete a relation
```
DELETE /api/v1/knowledge/relations/:id
```

### Traverse the graph
```
GET /api/v1/knowledge/traverse?startId=<id>&relation=works_on&depth=2&limit=50
```

### Search entities
```
GET /api/v1/knowledge/search?q=<query>&limit=10&minScore=0.5
```

### Validate the graph
```
POST /api/v1/knowledge/validate
```

## Behavior

- When the user provides structured information: create entities with `POST /api/v1/knowledge/entities`.
- When linking concepts: create relations with `POST /api/v1/knowledge/relations`.
- When the user asks "what do I know about X?": search with `GET /api/v1/knowledge/search?q=X`, then traverse with `GET /api/v1/knowledge/traverse` to explore connections.
- Periodically: call `POST /api/v1/knowledge/validate` to check graph constraints.
