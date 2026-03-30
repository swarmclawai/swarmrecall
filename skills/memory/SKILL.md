# SwarmRecall Memory

Conversational memory persistence with semantic search and session tracking via the SwarmRecall API.

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

### Store a memory
```
POST /api/v1/memory
{
  "content": "User prefers dark mode",
  "category": "preference",   // fact | preference | decision | context | session_summary
  "importance": 0.8,           // 0.0 to 1.0
  "tags": ["ui"],
  "metadata": {}
}
```

### Search memories
```
GET /api/v1/memory/search?q=<query>&limit=10&minScore=0.5
```

### List memories
```
GET /api/v1/memory?category=preference&limit=20&offset=0&includeArchived=false
```

### Get a memory
```
GET /api/v1/memory/:id
```

### Update a memory
```
PATCH /api/v1/memory/:id
{ "importance": 0.9, "tags": ["updated"], "archived": false }
```

### Delete a memory
```
DELETE /api/v1/memory/:id
```

### Start a session
```
POST /api/v1/memory/sessions
{ "context": {} }
```

### Get current session
```
GET /api/v1/memory/sessions/current
```

### Update a session
```
PATCH /api/v1/memory/sessions/:id
{ "summary": "Discussed project setup", "ended": true }
```

### List sessions
```
GET /api/v1/memory/sessions?limit=20&offset=0
```

## Behavior

- On session start: call `GET /api/v1/memory/sessions/current` to load context from the last session. If none, call `POST /api/v1/memory/sessions` to start one.
- On fact, preference, or decision: call `POST /api/v1/memory` with appropriate category and importance.
- On recall needed: call `GET /api/v1/memory/search?q=<query>` and use returned memories to inform your response.
- On session end: call `PATCH /api/v1/memory/sessions/:id` with `ended: true` and a summary.
