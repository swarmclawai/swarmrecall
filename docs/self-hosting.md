# Self-Hosting SwarmRecall

The hosted SwarmRecall service has been discontinued. SwarmRecall is now
open-source and self-host only. This guide covers running your own instance
locally for development and deploying it for production.

## Architecture

SwarmRecall is a pnpm + Turborepo monorepo:

- `packages/api` — Hono REST API server (port **3300**)
- `packages/web` — Next.js 15 dashboard (port **3400**)
- `packages/shared` — shared types, Zod schemas, constants
- `packages/sdk` — TypeScript SDK
- `packages/cli` — CLI tool

It depends on three backing services:

- **PostgreSQL 16 + pgvector** — primary store and 1536-dim vector embeddings
- **Meilisearch v1.12** — full-text search
- **Upstash Redis (optional)** — rate limiting and API-key cache; falls back to
  in-memory storage locally when unset

Embeddings run locally via a HuggingFace model
(`nomic-ai/nomic-embed-text-v1.5`), so no embedding API key is required.

## Local Quickstart

```bash
# 1. Start Postgres (pgvector) and Meilisearch
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Copy and edit environment variables
cp .env.example .env

# 4. Push the database schema
pnpm db:push

# 5. Start all dev servers
pnpm dev
```

After `pnpm dev`:

- **API**: http://localhost:3300
- **Dashboard**: http://localhost:3400
- **Meilisearch**: http://localhost:7700

`docker-compose.yml` starts Postgres (mapped to host port `65432`) and
Meilisearch (`7700`). With Redis env vars unset, rate limiting and the API-key
cache use in-memory fallbacks — fine for local development.

The SDK and CLI default their API base URL to `http://localhost:3300` and read
`SWARMRECALL_API_URL` to override it.

## Environment Variables

These mirror `.env.example`.

### Core

| Variable        | Description                                  | Example                                                            |
|-----------------|----------------------------------------------|--------------------------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string (pgvector)      | `postgresql://swarmrecall:swarmrecall@127.0.0.1:65432/swarmrecall` |
| `PORT`          | API server port                              | `3300`                                                             |
| `CORS_ORIGINS`  | Comma-separated allowed dashboard origins    | `https://your-domain,http://localhost:3400`                        |

### Search

| Variable              | Description            | Example                  |
|-----------------------|------------------------|--------------------------|
| `MEILISEARCH_URL`     | Meilisearch base URL   | `http://localhost:7700`  |
| `MEILISEARCH_API_KEY` | Meilisearch master key | `localdev`               |

### Cache / Rate Limiting (optional)

| Variable                   | Description                                          |
|----------------------------|------------------------------------------------------|
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST URL. Omit to use in-memory store. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token.                            |
| `RATE_LIMIT_DEFAULT`       | Default requests/min (e.g. `60`).                    |
| `RATE_LIMIT_SEARCH`        | Search requests/min (e.g. `30`).                     |

### Firebase — server-side (dashboard auth)

Used by `firebase-admin` to verify dashboard logins.

| Variable                | Description                       |
|-------------------------|-----------------------------------|
| `FIREBASE_PROJECT_ID`   | Firebase project ID               |
| `FIREBASE_CLIENT_EMAIL` | Service account email             |
| `FIREBASE_PRIVATE_KEY`  | Service account private key       |

### Firebase — client-side (`NEXT_PUBLIC_FIREBASE_*`)

These configure the web dashboard's Firebase client. They are **public client
config by design** — Firebase web API keys are not secrets and are safe to ship
to the browser. Access control comes from Firebase Security Rules and
server-side `firebase-admin` verification, not from hiding these values.

| Variable                            | Description              |
|-------------------------------------|--------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY`      | Firebase web API key     |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`  | Firebase auth domain     |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`   | Firebase project ID      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`       | Firebase app ID          |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID |

To use your own Firebase project, replace all of the values above with those
from your Firebase console.

## Production Deployment

### Render

The repo ships a [`render.yaml`](../render.yaml) Blueprint that provisions:

- a Docker web service for the API (built from `packages/api/Dockerfile`,
  health check at `/api/v1/health`)
- a private Meilisearch service with a persistent disk
- a managed PostgreSQL 16 database

Set the `sync: false` secrets (`MEILISEARCH_API_KEY`, the `FIREBASE_*`
credentials, and the Upstash Redis values if you use Redis) in the Render
dashboard, then deploy the Blueprint. Adjust `CORS_ORIGINS` and `DASHBOARD_URL`
to your own domains.

### Docker / docker-compose

[`docker-compose.yml`](../docker-compose.yml) defines the Postgres and
Meilisearch dependencies. For a containerized API, build
`packages/api/Dockerfile`. Bring your own managed Postgres + Meilisearch (or
extend the compose file), point `DATABASE_URL` and `MEILISEARCH_URL` at them,
and run `pnpm db:push` once to apply the schema. The API does not apply schema
migrations on startup.

The dashboard (`packages/web`) is a standard Next.js 15 app and can be deployed
to any Node host or Vercel; set the `NEXT_PUBLIC_FIREBASE_*` values at build
time.
