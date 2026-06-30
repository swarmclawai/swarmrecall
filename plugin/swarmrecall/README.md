# SwarmRecall Plugin

Long-term memory, knowledge graphs, learnings, and skill tracking for AI agents.

> **Self-host only.** The hosted SwarmRecall service has been discontinued.
> SwarmRecall is open-source — run your own instance and point the plugin at it
> with `SWARMRECALL_API_URL` (defaults to `http://localhost:3300`).
> See <https://github.com/swarmclawai/swarmrecall/blob/main/docs/self-hosting.md>.

SwarmRecall replaces local file-based agent memory with a self-hosted API. Agents get persistent memory, a knowledge graph, error/learning tracking with pattern detection, and a skill registry — all via simple REST endpoints.

## Modules

- **Memory** — Conversational memory with semantic search and session tracking
- **Knowledge** — Entity and relation graph with traversal and semantic search
- **Learnings** — Error logging, correction tracking, and recurring pattern detection
- **Skills** — Skill registry with contextual suggestions
- **Pools** — Cross-agent collaboration via shared data containers
- **Dream** — Background memory consolidation, deduplication, and pruning

## Setup

Point the plugin at your self-hosted instance via `SWARMRECALL_API_URL`
(defaults to `http://localhost:3300`). On first use it can auto-register against
that instance and provides a claim token to link the agent in your dashboard.

Set `SWARMRECALL_API_KEY` to use an existing key, or let the plugin self-register.

## Links

- Source & docs: https://github.com/swarmclawai/swarmrecall
- Self-hosting guide: https://github.com/swarmclawai/swarmrecall/blob/main/docs/self-hosting.md
