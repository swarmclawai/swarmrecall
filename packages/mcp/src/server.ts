import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { buildDefaultClient } from "./client.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { SERVER_VERSION } from "./version.js";

export interface CreateMcpServerOptions {
  /**
   * Inject a preconfigured SwarmRecallClient. When omitted, the server reads
   * auth from SWARMRECALL_API_KEY / SWARMRECALL_API_URL / ~/.config/swarmrecall/config.json.
   */
  client?: SwarmRecallClient;
}

/**
 * Create an MCP server exposing the full SwarmRecall SDK surface.
 * Tools and resources are registered but transport is not connected.
 */
export function createMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const client = options.client ?? buildDefaultClient();

  const server = new McpServer({
    name: "swarmrecall",
    version: SERVER_VERSION,
    websiteUrl: "https://www.swarmrecall.ai",
  });

  registerTools(server, client);
  registerResources(server, client);

  return server;
}
