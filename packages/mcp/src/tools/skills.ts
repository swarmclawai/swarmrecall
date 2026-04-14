import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { z } from "zod";
import { asToolText, safeHandler } from "../types.js";

export function registerSkillsTools(server: McpServer, client: SwarmRecallClient): void {
  server.registerTool(
    "skill_register",
    {
      description:
        "Register a skill the agent has acquired (e.g. 'code-review' from ClawHub).",
      inputSchema: {
        name: z.string().min(1).describe("Skill name"),
        version: z.string().optional().describe("Skill version"),
        source: z.string().optional().describe("Source (e.g. 'clawhub/code-review')"),
        description: z.string().optional(),
        triggers: z.array(z.string()).optional().describe("Trigger keywords"),
        dependencies: z.array(z.string()).optional().describe("Required dependencies"),
        config: z.record(z.unknown()).optional(),
        poolId: z.string().optional().describe("Register to a shared pool"),
      },
    },
    safeHandler(async (args) => asToolText(await client.skills.register(args))),
  );

  server.registerTool(
    "skill_list",
    {
      description: "List skills the agent has registered.",
      inputSchema: {
        status: z.string().optional().describe("Filter by status (e.g. 'active')"),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    safeHandler(async (args) => asToolText(await client.skills.list(args))),
  );

  server.registerTool(
    "skill_get",
    {
      description: "Fetch a skill by ID.",
      inputSchema: {
        id: z.string().min(1).describe("Skill ID"),
      },
    },
    safeHandler(async ({ id }) => asToolText(await client.skills.get(id))),
  );

  server.registerTool(
    "skill_update",
    {
      description: "Update a skill's version, config, or status.",
      inputSchema: {
        id: z.string().min(1).describe("Skill ID"),
        version: z.string().optional(),
        config: z.record(z.unknown()).optional(),
        status: z.string().optional(),
      },
    },
    safeHandler(async ({ id, ...params }) =>
      asToolText(await client.skills.update(id, params)),
    ),
  );

  server.registerTool(
    "skill_remove",
    {
      description: "Unregister a skill.",
      inputSchema: {
        id: z.string().min(1).describe("Skill ID"),
      },
    },
    safeHandler(async ({ id }) => asToolText(await client.skills.remove(id))),
  );

  server.registerTool(
    "skill_suggest",
    {
      description:
        "Suggest skills relevant to a given task context. Useful when the user describes what they want to do.",
      inputSchema: {
        context: z.string().min(1).describe("Task description"),
        limit: z.number().int().min(1).max(25).optional().describe("Max suggestions"),
      },
    },
    safeHandler(async ({ context, limit }) =>
      asToolText(await client.skills.suggest(context, limit)),
    ),
  );
}
