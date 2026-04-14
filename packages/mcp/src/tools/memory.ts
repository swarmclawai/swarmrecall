import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { z } from "zod";
import { asToolText, safeHandler } from "../types.js";

export function registerMemoryTools(server: McpServer, client: SwarmRecallClient): void {
  server.registerTool(
    "memory_store",
    {
      description:
        "Store a memory. Use for facts, preferences, decisions, context, or session summaries that the agent should recall later.",
      inputSchema: {
        content: z.string().min(1).describe("The memory text"),
        category: z
          .string()
          .min(1)
          .describe("Category: fact | preference | decision | context | session_summary"),
        importance: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Importance score from 0.0 to 1.0 (defaults to 0.5)"),
        tags: z.array(z.string()).optional().describe("Optional tags for filtering"),
        metadata: z
          .record(z.unknown())
          .optional()
          .describe("Arbitrary structured metadata"),
        sessionId: z
          .string()
          .optional()
          .describe("Attach the memory to a specific session"),
        poolId: z
          .string()
          .optional()
          .describe("Write the memory to a shared pool instead of the agent's private space"),
      },
    },
    safeHandler(async (args) => asToolText(await client.memory.store(args))),
  );

  server.registerTool(
    "memory_search",
    {
      description:
        "Semantic search across stored memories. Returns scored matches ordered by relevance.",
      inputSchema: {
        query: z.string().min(1).describe("Natural-language search query"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (default 10)"),
        minScore: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Minimum relevance score from 0.0 to 1.0"),
      },
    },
    safeHandler(async ({ query, limit, minScore }) =>
      asToolText(await client.memory.search(query, { limit, minScore })),
    ),
  );

  server.registerTool(
    "memory_get",
    {
      description: "Fetch a single memory by ID.",
      inputSchema: {
        id: z.string().min(1).describe("Memory ID"),
      },
    },
    safeHandler(async ({ id }) => asToolText(await client.memory.get(id))),
  );

  server.registerTool(
    "memory_list",
    {
      description: "List memories with optional filtering.",
      inputSchema: {
        category: z.string().optional().describe("Filter by category"),
        sessionId: z.string().optional().describe("Filter by session ID"),
        limit: z.number().int().min(1).max(200).optional().describe("Max results"),
        offset: z.number().int().min(0).optional().describe("Pagination offset"),
        includeArchived: z
          .boolean()
          .optional()
          .describe("Include archived memories"),
      },
    },
    safeHandler(async (args) => asToolText(await client.memory.list(args))),
  );

  server.registerTool(
    "memory_update",
    {
      description:
        "Update a memory's importance, tags, metadata, or archived flag. Content is immutable.",
      inputSchema: {
        id: z.string().min(1).describe("Memory ID"),
        importance: z.number().min(0).max(1).optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
        archived: z.boolean().optional(),
      },
    },
    safeHandler(async ({ id, ...params }) =>
      asToolText(await client.memory.update(id, params)),
    ),
  );

  server.registerTool(
    "memory_delete",
    {
      description: "Permanently delete a memory by ID.",
      inputSchema: {
        id: z.string().min(1).describe("Memory ID"),
      },
    },
    safeHandler(async ({ id }) => asToolText(await client.memory.delete(id))),
  );

  // --- Sessions ---

  server.registerTool(
    "memory_sessions_start",
    {
      description: "Start a new memory session. Sessions group related memories together.",
      inputSchema: {
        context: z
          .record(z.unknown())
          .optional()
          .describe("Initial context for the session"),
        poolId: z.string().optional().describe("Attach the session to a shared pool"),
      },
    },
    safeHandler(async (args) => asToolText(await client.memory.sessions.start(args))),
  );

  server.registerTool(
    "memory_sessions_current",
    {
      description: "Return the currently active memory session for this agent, if any.",
      inputSchema: {},
    },
    safeHandler(async () => asToolText(await client.memory.sessions.current())),
  );

  server.registerTool(
    "memory_sessions_update",
    {
      description:
        "Update a session's current state, append a summary, or mark it ended.",
      inputSchema: {
        id: z.string().min(1).describe("Session ID"),
        currentState: z.record(z.unknown()).optional(),
        summary: z.string().optional().describe("Session summary"),
        ended: z.boolean().optional().describe("Mark the session as ended"),
      },
    },
    safeHandler(async ({ id, ...params }) =>
      asToolText(await client.memory.sessions.update(id, params)),
    ),
  );

  server.registerTool(
    "memory_sessions_list",
    {
      description: "List memory sessions for this agent.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    safeHandler(async (args) => asToolText(await client.memory.sessions.list(args))),
  );
}
