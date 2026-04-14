import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";

function asTextResource(uri: string, text: string, mimeType = "application/json") {
  return { contents: [{ uri, mimeType, text }] };
}

async function safeRead(fn: () => Promise<unknown>): Promise<string> {
  try {
    return JSON.stringify(await fn(), null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: message }, null, 2);
  }
}

export function registerResources(server: McpServer, client: SwarmRecallClient): void {
  server.registerResource(
    "swarmrecall-pools",
    "swarmrecall://pools",
    {
      title: "SwarmRecall Pools",
      description: "Shared pools this agent belongs to with per-module access levels.",
      mimeType: "application/json",
    },
    async () =>
      asTextResource(
        "swarmrecall://pools",
        await safeRead(() => client.pools.list()),
      ),
  );

  server.registerResource(
    "swarmrecall-skills",
    "swarmrecall://skills",
    {
      title: "SwarmRecall Skills",
      description: "Skills this agent has registered.",
      mimeType: "application/json",
    },
    async () =>
      asTextResource(
        "swarmrecall://skills",
        await safeRead(() => client.skills.list()),
      ),
  );

  server.registerResource(
    "swarmrecall-sessions-current",
    "swarmrecall://sessions/current",
    {
      title: "SwarmRecall Current Session",
      description: "The currently active memory session for this agent, if any.",
      mimeType: "application/json",
    },
    async () =>
      asTextResource(
        "swarmrecall://sessions/current",
        await safeRead(() => client.memory.sessions.current()),
      ),
  );

  server.registerResource(
    "swarmrecall-dream-config",
    "swarmrecall://dream/config",
    {
      title: "SwarmRecall Dream Config",
      description:
        "The dream configuration for this agent (auto-run schedule, enabled operations, thresholds).",
      mimeType: "application/json",
    },
    async () =>
      asTextResource(
        "swarmrecall://dream/config",
        await safeRead(() => client.dream.getConfig()),
      ),
  );
}
