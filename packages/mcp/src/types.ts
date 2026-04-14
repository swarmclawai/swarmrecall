import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolTextContent = CallToolResult;

export function asToolText(value: unknown): CallToolResult {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }] };
}

export function asToolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function safeHandler<T>(
  fn: (args: T) => Promise<CallToolResult>,
): (args: T) => Promise<CallToolResult> {
  return async (args: T) => {
    try {
      return await fn(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return asToolError(`SwarmRecall error: ${message}`);
    }
  };
}
