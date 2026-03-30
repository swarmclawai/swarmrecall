# SwarmRecall Memory

Hosted agent memory persistence via the SwarmRecall API.

## Setup

Requires `SWARMRECALL_API_KEY` environment variable.

## Behavior

### On session start
- Call `GET /v1/memory/sessions/current` to load hot context from last session.
- If no active session, call `POST /v1/memory/sessions` to start one.

### On fact, preference, or decision
- Call `POST /v1/memory` with:
  - `content`: The information to remember
  - `category`: One of `fact`, `preference`, `decision`, `context`, `session_summary`
  - `importance`: 0.0 to 1.0 (higher = more important to recall)

### On recall needed
- Call `GET /v1/memory/search?q=<query>` for semantic retrieval.
- Use returned memories to inform your response.

### On session end
- Call `PATCH /v1/memory/sessions/:id` with `ended: true` and a summary.

## API Base URL

`https://api.swarmrecall.ai` (or `SWARMRECALL_API_URL` if set)
