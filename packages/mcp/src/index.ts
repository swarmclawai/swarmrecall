import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import type { CreateMcpServerOptions } from "./server.js";

export { createMcpServer } from "./server.js";
export type { CreateMcpServerOptions } from "./server.js";
export { SERVER_VERSION } from "./version.js";
export { buildDefaultClient } from "./client.js";

export interface StartMcpServerOptions extends CreateMcpServerOptions {
  transport?: StdioServerTransport;
}

export interface RunningMcpServer {
  close(): Promise<void>;
}

/**
 * Create the MCP server and connect it to a stdio transport. Returns a
 * handle with a close() method; wire this to SIGINT/SIGTERM in the caller.
 */
export async function startMcpServer(
  options: StartMcpServerOptions = {},
): Promise<RunningMcpServer> {
  const server = createMcpServer(options);
  const transport = options.transport ?? new StdioServerTransport();
  await server.connect(transport);
  return {
    async close() {
      await server.close();
    },
  };
}
