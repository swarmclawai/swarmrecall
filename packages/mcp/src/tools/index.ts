import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SwarmRecallClient } from "@swarmrecall/sdk";
import { registerMemoryTools } from "./memory.js";
import { registerKnowledgeTools } from "./knowledge.js";
import { registerLearningsTools } from "./learnings.js";
import { registerSkillsTools } from "./skills.js";
import { registerPoolsTools } from "./pools.js";
import { registerDreamTools } from "./dream.js";

export function registerTools(server: McpServer, client: SwarmRecallClient): void {
  registerMemoryTools(server, client);
  registerKnowledgeTools(server, client);
  registerLearningsTools(server, client);
  registerSkillsTools(server, client);
  registerPoolsTools(server, client);
  registerDreamTools(server, client);
}
