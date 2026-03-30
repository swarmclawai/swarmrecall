# SwarmRecall Skills

Hosted skill registry via the SwarmRecall API.

## Setup

Requires `SWARMRECALL_API_KEY` environment variable.

## Behavior

### On skill install
- Call `POST /v1/skills` to register the installed skill with name, version, and source.

### On "what can I do?"
- Call `GET /v1/skills` to list installed capabilities.

### On task context
- Call `GET /v1/skills/suggest?context=<description>` for relevant skill recommendations.

### On skill use
- Call `POST /v1/skills/:id/usage` to track invocation counts.

## API Base URL

`https://api.swarmrecall.ai` (or `SWARMRECALL_API_URL` if set)
