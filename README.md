# SwarmRecall

Long-term memory, knowledge, learnings, and skills for AI agents.

> **The hosted SwarmRecall service has been discontinued.** SwarmRecall is now
> fully open-source and **self-host only** — there is no longer a managed API at
> `swarmrecall.ai`. See **[docs/self-hosting.md](docs/self-hosting.md)** to run
> your own instance. The default API base URL is now `http://localhost:3300`
> (override with `SWARMRECALL_API_URL`).

Discord: https://discord.gg/sbEavS8cPV

## What is SwarmRecall?

SwarmRecall gives your AI agents long-term memory. Store memories with semantic search, build knowledge graphs connecting entities and concepts, extract learnings from repeated interactions, and maintain a registry of agent skills.

Install the SwarmRecall skill into your agent, point it at your self-hosted instance, and your agent auto-registers and starts persisting everything it learns. Run the dashboard to monitor and manage your agents' memory from a web UI.

## Features

- **Memory** — Semantic vector search across everything your agent has stored, with automatic deduplication
- **Knowledge** — Build a knowledge graph that connects entities, concepts, and relationships
- **Learnings** — Auto-distill patterns from agent interactions into reusable insights
- **Skills** — Registry of agent capabilities with versioning and sharing across your swarm
- **Pools** — Shared memory pools that multiple agents can read from and write to
- **Dashboard** — Web UI for monitoring, searching, and managing agent memory

## Packages

| Package | Description | Published |
|---------|-------------|-----------|
| `@swarmrecall/api` | Hono REST API server | — |
| `@swarmrecall/web` | Next.js dashboard | — |
| `@swarmrecall/shared` | Types, Zod schemas, constants | [`npm`](https://www.npmjs.com/package/@swarmrecall/shared) |
| `@swarmrecall/sdk` | TypeScript SDK | [`npm`](https://www.npmjs.com/package/@swarmrecall/sdk) |
| `@swarmrecall/cli` | CLI tool | [`npm`](https://www.npmjs.com/package/@swarmrecall/cli) |

## Quick Start

```bash
# Start infrastructure (Postgres, Meilisearch)
docker compose up -d

# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start all dev servers
pnpm dev
```

- **API**: http://localhost:3300
- **Dashboard**: http://localhost:3400

## Tech Stack

- **API**: Hono + Node.js 22
- **Database**: PostgreSQL 16 + pgvector (1536-dim embeddings, Drizzle ORM)
- **Search**: Meilisearch v1.12
- **Cache**: Upstash Redis REST (in-memory fallback for local dev)
- **Auth**: Firebase Auth (dashboard), API keys (agents)
- **Frontend**: Next.js 15 + Tailwind CSS + Radix UI
- **Build**: Turborepo + pnpm workspaces

## Self-Hosting

SwarmRecall is self-host only. See **[docs/self-hosting.md](docs/self-hosting.md)**
for a full guide covering Docker, environment variables, and deployment with the
included `render.yaml` / `docker-compose.yml`.

## SDK Usage

The SDK talks to your self-hosted API. It resolves the base URL from the
`SWARMRECALL_API_URL` environment variable and falls back to
`http://localhost:3300`, or you can pass `baseUrl` explicitly.

```typescript
import { SwarmRecallClient } from '@swarmrecall/sdk';

const client = new SwarmRecallClient({
  apiKey: process.env.SWARMRECALL_API_KEY,
  baseUrl: process.env.SWARMRECALL_API_URL, // defaults to http://localhost:3300
});

// Store a memory
await client.memories.create({
  content: 'The user prefers concise responses',
  type: 'observation',
});

// Semantic search
const results = await client.memories.search({
  query: 'user preferences',
  limit: 5,
});
```

## Ecosystem

SwarmRecall is part of the Swarm ecosystem:

| Platform | Purpose |
|----------|---------|
| [SwarmClaw](https://www.swarmclaw.ai) | Agent runtime and control plane |
| [SwarmDock](https://www.swarmdock.ai) | Agent marketplace |
| **SwarmRecall** | **Agent memory and knowledge** |
| [SwarmRelay](https://www.swarmrelay.ai) | Encrypted agent messaging |
| [SwarmFeed](https://www.swarmfeed.ai) | Social network for agents |

## License

MIT
