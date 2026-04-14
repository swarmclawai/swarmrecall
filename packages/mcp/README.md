# @swarmrecall/mcp

Model Context Protocol (MCP) server for [SwarmRecall](https://www.swarmrecall.ai) — the hosted agent persistence layer that gives AI agents persistent memory, a knowledge graph, learnings, skills, shared pools, and background consolidation ("dream") cycles.

This package exposes every SwarmRecall SDK operation as an MCP tool over stdio, so any MCP-compatible client (Claude Desktop, Claude Code, Cursor, Continue, Zed, etc.) can read and write SwarmRecall data without custom glue.

## Install

The easiest way is to install the SwarmRecall CLI, which bundles this server:

```bash
npm install -g @swarmrecall/cli
swarmrecall register --save
swarmrecall mcp   # launches the MCP server over stdio
```

You can also use this package directly (for embedding in your own agent):

```bash
npm install @swarmrecall/mcp @swarmrecall/sdk
```

```ts
import { startMcpServer } from '@swarmrecall/mcp';

const server = await startMcpServer();
process.on('SIGINT', () => server.close());
```

## Configuration

The server reads authentication from (in order):

1. Environment variable `SWARMRECALL_API_KEY`
2. `~/.config/swarmrecall/config.json` (set via `swarmrecall config set-key <key>`)

Optional: override the API base URL with `SWARMRECALL_API_URL` or `swarmrecall config set-url <url>`.

## Tool surface

52 tools grouped by module:

- **memory** (10): `memory_store`, `memory_search`, `memory_get`, `memory_list`, `memory_update`, `memory_delete`, `memory_sessions_start`, `memory_sessions_current`, `memory_sessions_update`, `memory_sessions_list`
- **knowledge** (11): `knowledge_entity_create`, `knowledge_entity_get`, `knowledge_entity_list`, `knowledge_entity_update`, `knowledge_entity_delete`, `knowledge_relation_create`, `knowledge_relation_list`, `knowledge_relation_delete`, `knowledge_traverse`, `knowledge_search`, `knowledge_validate`
- **learnings** (9): `learning_log`, `learning_search`, `learning_get`, `learning_list`, `learning_update`, `learning_patterns`, `learning_promotions`, `learning_resolve`, `learning_link`
- **skills** (6): `skill_register`, `skill_list`, `skill_get`, `skill_update`, `skill_remove`, `skill_suggest`
- **pools** (2): `pool_list`, `pool_get`
- **dream** (14): `dream_start`, `dream_get`, `dream_list`, `dream_update`, `dream_complete`, `dream_fail`, `dream_get_config`, `dream_update_config`, `dream_get_duplicates`, `dream_get_unsummarized_sessions`, `dream_get_duplicate_entities`, `dream_get_stale`, `dream_get_contradictions`, `dream_get_unprocessed`, `dream_execute`

Plus 4 read-only resources: `swarmrecall://config`, `swarmrecall://pools`, `swarmrecall://skills`, `swarmrecall://sessions/current`.

See the full tool reference and copy-pasteable client configs at <https://www.swarmrecall.ai/docs/mcp>.

## License

MIT
