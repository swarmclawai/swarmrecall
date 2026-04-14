import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { createMcpServer } from "./server.js";

export interface HandleMcpHttpRequestOptions {
  /** SwarmRecallClient bound to the caller's identity. Required. */
  client: SwarmRecallClient;
  /** Return plain JSON responses instead of an SSE stream. Default true. */
  enableJsonResponse?: boolean;
  /** When provided, session IDs are generated and echoed back. Default: stateless (no sessions). */
  sessionIdGenerator?: () => string;
}

/**
 * Fetch-standard HTTP handler for the SwarmRecall MCP server.
 * Compatible with Hono (`app.all('/mcp', (c) => handleMcpHttpRequest(c.req.raw, { client }))`),
 * Cloudflare Workers, Deno, Bun, and any runtime that speaks `Request`/`Response`.
 *
 * Each call builds a fresh MCP server + transport; safe for stateless per-request use.
 */
export async function handleMcpHttpRequest(
  request: Request,
  options: HandleMcpHttpRequestOptions,
): Promise<Response> {
  const server = createMcpServer({ client: options.client });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: options.sessionIdGenerator,
    enableJsonResponse: options.enableJsonResponse ?? true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  }
}
