import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { z } from "zod";
import { asToolText, safeHandler } from "../types.js";

export function registerLearningsTools(server: McpServer, client: SwarmRecallClient): void {
  server.registerTool(
    "learning_log",
    {
      description:
        "Log a learning (error, correction, discovery, optimization, or preference) for later pattern detection.",
      inputSchema: {
        category: z
          .string()
          .min(1)
          .describe(
            "Category: error | correction | discovery | optimization | preference",
          ),
        summary: z.string().min(1).describe("Short summary of the learning"),
        details: z.string().optional().describe("Full details / output"),
        priority: z
          .string()
          .optional()
          .describe("Priority: low | medium | high | critical"),
        area: z.string().optional().describe("Functional area (e.g. 'build', 'auth')"),
        suggestedAction: z
          .string()
          .optional()
          .describe("Suggested corrective action"),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
        poolId: z.string().optional().describe("Write to a shared pool"),
      },
    },
    safeHandler(async (args) => asToolText(await client.learnings.log(args))),
  );

  server.registerTool(
    "learning_search",
    {
      description: "Semantic search across learnings.",
      inputSchema: {
        query: z.string().min(1).describe("Search query"),
        limit: z.number().int().min(1).max(100).optional(),
        minScore: z.number().min(0).max(1).optional(),
      },
    },
    safeHandler(async ({ query, limit, minScore }) =>
      asToolText(await client.learnings.search(query, { limit, minScore })),
    ),
  );

  server.registerTool(
    "learning_get",
    {
      description: "Fetch a single learning by ID.",
      inputSchema: {
        id: z.string().min(1).describe("Learning ID"),
      },
    },
    safeHandler(async ({ id }) => asToolText(await client.learnings.get(id))),
  );

  server.registerTool(
    "learning_list",
    {
      description: "List learnings with optional filtering.",
      inputSchema: {
        category: z.string().optional(),
        status: z.string().optional().describe("open | resolved | wontfix"),
        priority: z.string().optional(),
        area: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    safeHandler(async (args) => asToolText(await client.learnings.list(args))),
  );

  server.registerTool(
    "learning_update",
    {
      description: "Update a learning's status, priority, resolution, area, or tags.",
      inputSchema: {
        id: z.string().min(1).describe("Learning ID"),
        status: z.string().optional(),
        priority: z.string().optional(),
        resolution: z.string().optional().describe("Resolution summary"),
        resolutionCommit: z
          .string()
          .optional()
          .describe("Commit SHA that resolved the issue"),
        area: z.string().optional(),
        tags: z.array(z.string()).optional(),
      },
    },
    safeHandler(async ({ id, ...params }) =>
      asToolText(await client.learnings.update(id, params)),
    ),
  );

  server.registerTool(
    "learning_patterns",
    {
      description:
        "List recurring patterns detected across multiple learnings (e.g. the same error surfacing repeatedly).",
      inputSchema: {},
    },
    safeHandler(async () => asToolText(await client.learnings.patterns())),
  );

  server.registerTool(
    "learning_promotions",
    {
      description:
        "List patterns that are ready to be promoted into actionable rules. Surface these to the user for approval before acting.",
      inputSchema: {},
    },
    safeHandler(async () => asToolText(await client.learnings.promotions())),
  );

  server.registerTool(
    "learning_resolve",
    {
      description:
        "Mark a learning as resolved with a resolution summary and optional commit SHA.",
      inputSchema: {
        id: z.string().min(1).describe("Learning ID"),
        resolution: z.string().min(1).describe("Resolution summary"),
        commit: z.string().optional().describe("Commit SHA (optional)"),
      },
    },
    safeHandler(async ({ id, resolution, commit }) =>
      asToolText(await client.learnings.resolve(id, { resolution, commit })),
    ),
  );

  server.registerTool(
    "learning_link",
    {
      description: "Link a learning to a related learning (contributes to pattern detection).",
      inputSchema: {
        id: z.string().min(1).describe("Source learning ID"),
        targetId: z.string().min(1).describe("Target learning ID"),
      },
    },
    safeHandler(async ({ id, targetId }) =>
      asToolText(await client.learnings.link(id, targetId)),
    ),
  );
}
