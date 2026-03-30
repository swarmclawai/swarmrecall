# SwarmRecall Learnings

Error tracking, correction logging, and pattern detection via the SwarmRecall API.

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

### Log a learning
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

### Search learnings
```
GET /api/v1/learnings/search?q=<query>&limit=10&minScore=0.5
```

### Get a learning
```
GET /api/v1/learnings/:id
```

### List learnings
```
GET /api/v1/learnings?category=error&status=open&priority=high&area=build&limit=20&offset=0
```

### Update a learning
```
PATCH /api/v1/learnings/:id
{ "status": "resolved", "resolution": "Added --legacy-peer-deps", "resolutionCommit": "abc123" }
```

### Get recurring patterns
```
GET /api/v1/learnings/patterns
```

### Get promotion candidates
```
GET /api/v1/learnings/promotions
```

### Link related learnings
```
POST /api/v1/learnings/:id/link
{ "targetId": "<other-learning-id>" }
```

## Behavior

- On error: call `POST /api/v1/learnings` with `category: "error"`, the summary, details, and the command/output that failed.
- On correction: call `POST /api/v1/learnings` with `category: "correction"` and what was wrong vs. what is correct.
- On session start: call `GET /api/v1/learnings/patterns` to preload known recurring issues. Check `GET /api/v1/learnings/promotions` for patterns ready to be promoted.
- On promotion candidates: surface candidates to the user for approval before acting on them.
