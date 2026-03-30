# ---- Stage 1: Install dependencies ----
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api/package.json ./packages/api/package.json

RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build ----
FROM deps AS build

WORKDIR /app

COPY packages/shared/ ./packages/shared/
COPY tsconfig.json ./tsconfig.json
RUN pnpm --filter @swarmrecall/shared build

COPY packages/api/ ./packages/api/
RUN pnpm --filter @swarmrecall/api build

# ---- Stage 3: Production runner ----
FROM node:22-slim AS run

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist/ ./packages/shared/dist/

COPY --from=build /app/packages/api/package.json ./packages/api/package.json
COPY --from=build /app/packages/api/dist/ ./packages/api/dist/

COPY --from=build /app/packages/api/drizzle.config.ts ./packages/api/drizzle.config.ts
COPY --from=build /app/packages/api/src/db/schema.ts ./packages/api/src/db/schema.ts
COPY packages/api/start.sh ./packages/api/start.sh

COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/packages/api/node_modules/ ./packages/api/node_modules/
COPY --from=build /app/packages/shared/node_modules/ ./packages/shared/node_modules/

ENV NODE_ENV=production
EXPOSE 3300

WORKDIR /app/packages/api

CMD ["sh", "start.sh"]
