import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { z } from "zod";
import { asToolText, safeHandler } from "../types.js";

export function registerDreamTools(server: McpServer, client: SwarmRecallClient): void {
  // --- Cycle management ---

  server.registerTool(
    "dream_start",
    {
      description:
        "Start a dream cycle for background memory consolidation (deduplication, pruning, contradiction resolution). Fails with 409 if a cycle is already running.",
      inputSchema: {
        operations: z
          .array(z.string())
          .optional()
          .describe("Specific operations to run"),
        thresholds: z
          .record(z.number())
          .optional()
          .describe("Override default thresholds"),
        dryRun: z.boolean().optional().describe("Preview without making changes"),
      },
    },
    safeHandler(async (args) => asToolText(await client.dream.start(args))),
  );

  server.registerTool(
    "dream_get",
    {
      description: "Get details of a specific dream cycle.",
      inputSchema: {
        id: z.string().min(1).describe("Dream cycle ID"),
      },
    },
    safeHandler(async ({ id }) => asToolText(await client.dream.get(id))),
  );

  server.registerTool(
    "dream_list",
    {
      description: "List dream cycles.",
      inputSchema: {
        status: z
          .string()
          .optional()
          .describe("Filter by status (running | completed | failed)"),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    safeHandler(async (args) => asToolText(await client.dream.list(args))),
  );

  server.registerTool(
    "dream_update",
    {
      description: "Update a dream cycle's status or attach results.",
      inputSchema: {
        id: z.string().min(1).describe("Dream cycle ID"),
        status: z.string().optional(),
        results: z.record(z.unknown()).optional(),
        error: z.string().optional(),
      },
    },
    safeHandler(async ({ id, ...params }) =>
      asToolText(await client.dream.update(id, params)),
    ),
  );

  server.registerTool(
    "dream_complete",
    {
      description: "Mark a dream cycle as completed with the provided results.",
      inputSchema: {
        id: z.string().min(1).describe("Dream cycle ID"),
        results: z
          .record(z.unknown())
          .describe("Dream results object (DreamResults shape)"),
      },
    },
    safeHandler(async ({ id, results }) =>
      asToolText(
        await client.dream.complete(
          id,
          results as unknown as Parameters<typeof client.dream.complete>[1],
        ),
      ),
    ),
  );

  server.registerTool(
    "dream_fail",
    {
      description: "Mark a dream cycle as failed with an error message.",
      inputSchema: {
        id: z.string().min(1).describe("Dream cycle ID"),
        error: z.string().min(1).describe("Error message"),
      },
    },
    safeHandler(async ({ id, error }) =>
      asToolText(await client.dream.fail(id, error)),
    ),
  );

  // --- Config ---

  server.registerTool(
    "dream_get_config",
    {
      description: "Get the current dream configuration (enabled, interval, operations, thresholds).",
      inputSchema: {},
    },
    safeHandler(async () => asToolText(await client.dream.getConfig())),
  );

  server.registerTool(
    "dream_update_config",
    {
      description: "Update the dream configuration.",
      inputSchema: {
        enabled: z.boolean().optional(),
        intervalHours: z.number().int().min(1).optional(),
        operations: z.array(z.string()).optional(),
        thresholds: z.record(z.number()).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.dream.updateConfig(args)),
    ),
  );

  // --- Candidates ---

  server.registerTool(
    "dream_get_duplicates",
    {
      description:
        "Fetch candidate memory clusters that exceed the similarity threshold (potential duplicates).",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.dream.getDuplicates(args)),
    ),
  );

  server.registerTool(
    "dream_get_unsummarized_sessions",
    {
      description: "Fetch completed sessions that are missing summaries.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.dream.getUnsummarizedSessions(args)),
    ),
  );

  server.registerTool(
    "dream_get_duplicate_entities",
    {
      description: "Fetch entity pairs that may be duplicates.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.dream.getDuplicateEntities(args)),
    ),
  );

  server.registerTool(
    "dream_get_stale",
    {
      description: "Fetch memories past the decay age (candidates for archival).",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) => asToolText(await client.dream.getStale(args))),
  );

  server.registerTool(
    "dream_get_contradictions",
    {
      description: "Fetch memory pairs with divergent content (potential contradictions).",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.dream.getContradictions(args)),
    ),
  );

  server.registerTool(
    "dream_get_unprocessed",
    {
      description: "Fetch memories that have not yet been processed for entity extraction.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    safeHandler(async (args) =>
      asToolText(await client.dream.getUnprocessed(args)),
    ),
  );

  // --- Tier 1 execution ---

  server.registerTool(
    "dream_execute",
    {
      description:
        "Run Tier 1 server-side dream operations (decay, prune, orphan cleanup). Returns execution stats.",
      inputSchema: {
        operations: z
          .array(z.string())
          .optional()
          .describe("Specific operations to run"),
      },
    },
    safeHandler(async (args) => asToolText(await client.dream.execute(args))),
  );
}
