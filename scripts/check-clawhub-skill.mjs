#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const skillDir = path.join(repoRoot, "skills", "swarmrecall");

const REQUIRED_FILES = [
  "SKILL.md",
  "README.md",
  "TROUBLESHOOTING.md",
  "examples/quickstart.md",
  "examples/memory-workflow.md",
  "examples/knowledge-graph.md",
  "examples/learnings-workflow.md",
  "references/commands.md",
  "references/mcp-tools.md",
  "validation/smoke-prompts.md",
];

const REQUIRED_README_SUBSTRINGS = [
  "clawhub install swarmrecall",
  "npm install -g @swarmrecall/cli",
  "swarmrecall --version",
  "clawhub update swarmrecall",
  "npm install -g @swarmrecall/cli@latest",
  "swarmrecall register",
  "swarmrecall config show",
  "swarmrecall mcp",
  "swarmrecall memory store",
  "swarmrecall memory search",
  "swarmrecall knowledge create",
  "swarmrecall knowledge traverse",
  "swarmrecall learnings log",
  "swarmrecall dream start",
  "https://www.swarmrecall.ai/docs",
  "https://www.swarmrecall.ai/docs/mcp",
  "https://swarmrecall-api.onrender.com/mcp",
  "https://www.npmjs.com/package/@swarmrecall/cli",
  "https://github.com/swarmclawai/swarmrecall",
];

function assertCondition(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
}

function extractMatch(content, regex, label) {
  const match = content.match(regex);
  if (!match?.[1]) {
    console.error(`✗ Could not read ${label} from SKILL.md`);
    process.exit(1);
  }
  return match[1];
}

// Required files
for (const relativePath of REQUIRED_FILES) {
  const absolutePath = path.join(skillDir, relativePath);
  const content = await fs.readFile(absolutePath, "utf8").catch(() => null);
  assertCondition(content !== null, `Skill file ${relativePath} is missing`);
  assertCondition(content.trim().length > 0, `Skill file ${relativePath} is empty`);
}

// SKILL.md metadata
const skillContent = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8");
const skillVersion = extractMatch(skillContent, /^version:\s*"([^"]+)"$/m, "version");
const metadataJson = extractMatch(skillContent, /^metadata:\s*'(.+)'$/m, "metadata");
const metadata = JSON.parse(metadataJson);
const openclaw = metadata.openclaw ?? {};
const installEntries = Array.isArray(openclaw.install) ? openclaw.install : [];
const primaryInstall = installEntries.find((entry) => entry?.package === "@swarmrecall/cli");
const mcpServers = Array.isArray(openclaw.mcp_servers) ? openclaw.mcp_servers : [];

assertCondition(
  Array.isArray(openclaw.requires?.anyBins),
  "Skill metadata is missing openclaw.requires.anyBins",
);
assertCondition(
  openclaw.requires.anyBins.includes("swarmrecall"),
  "Skill metadata is missing the swarmrecall bin requirement",
);
assertCondition(
  primaryInstall,
  "Skill metadata is missing the @swarmrecall/cli install entry",
);
assertCondition(
  Array.isArray(primaryInstall.bins) && primaryInstall.bins.includes("swarmrecall"),
  "Skill install entry must expose the swarmrecall bin",
);
assertCondition(
  typeof openclaw.homepage === "string" && openclaw.homepage.includes("swarmrecall.ai"),
  "Skill metadata homepage is missing or invalid",
);
assertCondition(
  mcpServers.some((entry) => entry?.command === "swarmrecall"),
  "Skill metadata must advertise the local stdio MCP server",
);
assertCondition(
  mcpServers.some((entry) => typeof entry?.url === "string" && entry.url.includes("/mcp")),
  "Skill metadata must advertise the remote HTTP MCP server",
);

// README keyword coverage
const readmeContent = await fs.readFile(path.join(skillDir, "README.md"), "utf8");
for (const required of REQUIRED_README_SUBSTRINGS) {
  assertCondition(
    readmeContent.includes(required),
    `Skill README is missing required content: ${required}`,
  );
}

console.log(
  `ClawHub skill check passed: ${REQUIRED_FILES.length} files, ${REQUIRED_README_SUBSTRINGS.length} README keywords, skill version ${skillVersion}.`,
);
