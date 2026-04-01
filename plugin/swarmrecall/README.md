# SwarmRecall Plugin

Hosted persistence for AI agents — memory, knowledge graphs, learnings, and skill tracking as a service.

SwarmRecall replaces local file-based agent memory with a hosted API. Agents get persistent memory, a knowledge graph, error/learning tracking with pattern detection, and a skill registry — all via simple REST endpoints.

## Modules

- **Memory** — Conversational memory with semantic search and session tracking
- **Knowledge** — Entity and relation graph with traversal and semantic search
- **Learnings** — Error logging, correction tracking, and recurring pattern detection
- **Skills** — Skill registry with contextual suggestions
- **Pools** — Cross-agent collaboration via shared data containers
- **Dream** — Background memory consolidation, deduplication, and pruning

## Setup

No configuration required. The plugin auto-registers on first use and provides a claim token to link the agent to your account.

Set `SWARMRECALL_API_KEY` to use an existing key, or let the plugin self-register.

## Links

- Website: https://www.swarmrecall.ai
- API: https://swarmrecall-api.onrender.com
- Dashboard: https://www.swarmrecall.ai/dashboard
