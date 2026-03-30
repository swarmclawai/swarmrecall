# SwarmRecall Learnings

Hosted learning persistence with pattern detection via the SwarmRecall API.

## Setup

Requires `SWARMRECALL_API_KEY` environment variable.

## Behavior

### On error
- Call `POST /v1/learnings` with `category: "error"`, summary, details, and the command/output that failed.

### On correction
- Call `POST /v1/learnings` with `category: "correction"` and what was wrong vs. what's correct.

### On session start
- Call `GET /v1/learnings/patterns` to preload known recurring issues.
- Check `GET /v1/learnings/promotions` for patterns ready to be promoted.

### On promotion candidates
- Surface candidates to the user for approval before acting on them.

## API Base URL

`https://api.swarmrecall.ai` (or `SWARMRECALL_API_URL` if set)
