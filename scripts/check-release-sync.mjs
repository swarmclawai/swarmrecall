#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const PACKAGES = ["shared", "sdk", "cli", "mcp", "api", "web"];

function assertCondition(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
}

function extractMatch(content, regex, label) {
  const match = content.match(regex);
  if (!match?.[1]) {
    console.error(`✗ Could not read ${label}`);
    process.exit(1);
  }
  return match[1];
}

const rootPackageJson = JSON.parse(
  await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
);
const rootVersion = rootPackageJson.version;

for (const pkg of PACKAGES) {
  const pkgJsonPath = path.join(repoRoot, "packages", pkg, "package.json");
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf8"));
  assertCondition(
    pkgJson.version === rootVersion,
    `packages/${pkg} version ${pkgJson.version} is out of sync with root version ${rootVersion}`,
  );
}

const mcpVersionSource = await fs.readFile(
  path.join(repoRoot, "packages", "mcp", "src", "version.ts"),
  "utf8",
);
const mcpServerVersion = extractMatch(
  mcpVersionSource,
  /SERVER_VERSION\s*=\s*"([^"]+)"/,
  "SERVER_VERSION from packages/mcp/src/version.ts",
);
assertCondition(
  mcpServerVersion === rootVersion,
  `MCP SERVER_VERSION ${mcpServerVersion} is out of sync with root version ${rootVersion}`,
);

const cliVersionCall = extractMatch(
  await fs.readFile(path.join(repoRoot, "packages", "cli", "src", "index.ts"), "utf8"),
  /\.version\('([^']+)'\)/,
  "CLI .version() from packages/cli/src/index.ts",
);
assertCondition(
  cliVersionCall === rootVersion,
  `CLI .version() surface ${cliVersionCall} is out of sync with root version ${rootVersion}`,
);

const skillContent = await fs.readFile(
  path.join(repoRoot, "skills", "swarmrecall", "SKILL.md"),
  "utf8",
);
const skillVersion = extractMatch(
  skillContent,
  /^version:\s*"([^"]+)"$/m,
  "skill version from skills/swarmrecall/SKILL.md",
);

// Skill version lives on its own (ClawHub) track — enforce monotonic increase,
// not equality with the npm package version.
console.log(`Root/package version: ${rootVersion}`);
console.log(`Skill version:        ${skillVersion} (independent track)`);
console.log(`Release sync check passed.`);
