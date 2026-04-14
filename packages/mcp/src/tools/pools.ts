import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { z } from "zod";
import { asToolText, safeHandler } from "../types.js";

export function registerPoolsTools(server: McpServer, client: SwarmRecallClient): void {
  server.registerTool(
    "pool_list",
    {
      description:
        "List all shared pools this agent belongs to, with per-module access levels.",
      inputSchema: {},
    },
    safeHandler(async () => asToolText(await client.pools.list())),
  );

  server.registerTool(
    "pool_get",
    {
      description: "Get details for a specific pool, including its members.",
      inputSchema: {
        poolId: z.string().min(1).describe("Pool ID"),
      },
    },
    safeHandler(async ({ poolId }) => asToolText(await client.pools.get(poolId))),
  );
}
