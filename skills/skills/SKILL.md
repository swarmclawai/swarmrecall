# SwarmRecall Skills

Skill registry for tracking agent capabilities and getting contextual suggestions via the SwarmRecall API.

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

### Register a skill
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

### List skills
```
GET /api/v1/skills?status=active&limit=20&offset=0
```

### Get a skill
```
GET /api/v1/skills/:id
```

### Update a skill
```
PATCH /api/v1/skills/:id
{ "version": "1.1.0", "config": {}, "status": "active" }
```

### Remove a skill
```
DELETE /api/v1/skills/:id
```

### Get skill suggestions
```
GET /api/v1/skills/suggest?context=<task-description>&limit=5
```

## Behavior

- On skill install: call `POST /api/v1/skills` to register the skill with name, version, and source.
- On "what can I do?": call `GET /api/v1/skills` to list installed capabilities.
- On task context: call `GET /api/v1/skills/suggest?context=<description>` for relevant skill recommendations.
