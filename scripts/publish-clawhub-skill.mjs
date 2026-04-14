#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_TAGS = [
  "latest",
  "swarmrecall",
  "memory",
  "knowledge-graph",
  "learnings",
  "skills",
  "pools",
  "dream",
  "mcp",
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const skillDir = path.join(repoRoot, "skills", "swarmrecall");

function parseArgs(argv) {
  const args = { dryRun: false, version: undefined, changelog: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") continue;
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--version") {
      args.version = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--changelog") {
      args.changelog = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

function readChangelogSummary(content, version) {
  const lines = content.split(/\r?\n/);
  const heading = `## ${version}`;
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) {
    throw new Error(`Could not find changelog heading for ${version}`);
  }
  const bullets = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) bullets.push(line.slice(2).trim());
  }
  if (bullets.length === 0) {
    throw new Error(`Could not find changelog bullet points for ${version}`);
  }
  return bullets.join("; ");
}

function extractSkillVersion(skillContent) {
  const match = skillContent.match(/^version:\s*"([^"]+)"$/m);
  if (!match?.[1]) throw new Error("Could not read skill version");
  return match[1];
}

const args = parseArgs(process.argv.slice(2));
const skillContent = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8");
const skillVersion = args.version ?? extractSkillVersion(skillContent);
const changelogContent = await fs.readFile(path.join(repoRoot, "CHANGELOG.md"), "utf8");
const rootPackageJson = JSON.parse(
  await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
);
const packageVersion = rootPackageJson.version;
const changelog =
  args.changelog ??
  readChangelogSummary(changelogContent, packageVersion);

// Validate the skill bundle before publishing
await run("node", [path.join(scriptDir, "check-clawhub-skill.mjs")], { cwd: repoRoot });

const publishArgs = [
  "publish",
  skillDir,
  "--slug",
  "swarmrecall",
  "--name",
  "SwarmRecall",
  "--version",
  skillVersion,
  "--changelog",
  changelog,
  "--tags",
  DEFAULT_TAGS.join(","),
];

if (args.dryRun) {
  console.log(`\nDry-run: would execute`);
  console.log(`  clawhub ${publishArgs.join(" ")}`);
  console.log(`\nSkill version: ${skillVersion}`);
  console.log(`Package version: ${packageVersion}`);
  console.log(`Changelog: ${changelog}`);
  process.exit(0);
}

await run("clawhub", publishArgs, { cwd: repoRoot });
