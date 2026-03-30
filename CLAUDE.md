# SwarmRecall

Hosted agent persistence layer — memory, knowledge, learnings, and skills as a service.

## Quick Start

```bash
docker-compose up -d    # Start Postgres and Meilisearch
pnpm install
pnpm db:push            # Push schema to Postgres
pnpm dev                # Start all packages
```

- API: http://localhost:3300
- Dashboard: http://localhost:3400
- Meilisearch: http://localhost:7700

## Monorepo Structure

- `packages/shared` — Types, Zod schemas, constants (@swarmrecall/shared)
- `packages/api` — Hono API server on port 3300 (@swarmrecall/api)
- `packages/web` — Next.js 15 dashboard on port 3400 (@swarmrecall/web)
- `packages/sdk` — TypeScript SDK (@swarmrecall/sdk)
- `packages/cli` — CLI tool (@swarmrecall/cli)
- `skills/` — ClawHub skill files (not npm packages)

## Key Commands

```bash
pnpm dev              # Start all packages in dev mode
pnpm build            # Build all packages
pnpm db:push          # Push Drizzle schema to database
pnpm db:seed          # Seed test data
pnpm test             # Run all tests
pnpm type-check       # TypeScript checking
```

## Tech Stack

- **API**: Hono + Node.js 22
- **Database**: PostgreSQL 16 + pgvector (1536-dim embeddings)
- **Cache**: Upstash Redis REST in hosted environments, in-memory fallback in dev when unset
- **Search**: Meilisearch v1.12
- **Auth**: Firebase Auth (dashboard) + API keys (agents)
- **ORM**: Drizzle
- **Dashboard**: Next.js 15 + Tailwind + Radix UI
- **Deploy**: Render (API) + Vercel (web)

## Auth

Two auth flows:
1. **Dashboard**: Firebase Auth (Google, GitHub, email/password) — verified server-side via firebase-admin
2. **Agent API**: API keys (`sr_live_...`) sent as Bearer tokens — SHA-256 hashed in DB, scoped per module

## Runtime Notes

- The API does not apply schema changes on startup. Run `pnpm db:push` explicitly when you need to update the database schema.
- Local `docker-compose` only starts Postgres and Meilisearch. Rate limiting and API key cache fall back to in-memory storage unless `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.

## Conventions

- All data tables include `ownerId` for tenant isolation
- Soft delete via `archivedAt` (memories, entities, learnings)
- All text content gets vector embeddings for semantic search
- Shared package must build before api/web/sdk
