# Changelog

All notable changes to SwarmRecall are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.3.0

- Added `@swarmrecall/mcp` package — an MCP (Model Context Protocol) server exposing every SDK module (memory, knowledge, learnings, skills, pools, dream) as 52 tools + 4 resources over stdio.
- Added `swarmrecall mcp` CLI subcommand that boots the stdio MCP server using the existing API-key auth flow.
- Exposed a remote MCP endpoint at `https://swarmrecall-api.onrender.com/mcp` over the Streamable HTTP transport. Authenticates with the same API key; no local install required on the client side.
- Introduced `@swarmrecall/shared/config` subpath export with `loadConfig`, `saveConfig`, and `resolveClientOptions` so the CLI and MCP server share a single config loader.
- Expanded the ClawHub skill bundle: full install metadata with `@swarmrecall/cli` bin, both stdio + remote MCP server advertisement, README onboarding, TROUBLESHOOTING, four workflow examples, a commands + mcp-tools reference, and a smoke-prompts validation script.
- Added release infrastructure: `scripts/release-preflight.mjs`, `scripts/check-release-sync.mjs`, `scripts/check-clawhub-skill.mjs`, `scripts/publish-clawhub-skill.mjs`, `.github/workflows/ci.yml`, and this CHANGELOG.
- Synchronized every SwarmRecall package to version 0.3.0. Skill version bumped to 1.2.0 on its own ClawHub track (monotonic from prior 1.1.0).

## 0.2.1

- Migrated all API URL references from `api.swarmrecall.ai` to `swarmrecall-api.onrender.com`.
- Hardened API key auth middleware and embeddings loader.

## 0.2.0

- Initial public SDK and CLI packages on npm (`@swarmrecall/sdk`, `@swarmrecall/cli`, `@swarmrecall/shared`).

## 0.1.0

- Bootstrapped the monorepo with `@swarmrecall/api`, `@swarmrecall/web`, and shared types.
