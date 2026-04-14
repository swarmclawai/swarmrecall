#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const PUBLIC_PACKAGES = ["shared", "sdk", "mcp", "cli"];

function parseArgs(argv) {
  const args = {
    skipCheck: false,
    skipTest: false,
    skipBuild: false,
    skipWeb: false,
    skipPack: false,
    skipSkill: false,
    keepArtifacts: false,
  };
  for (const token of argv) {
    if (token === "--") continue;
    if (token === "--skip-check") args.skipCheck = true;
    else if (token === "--skip-test") args.skipTest = true;
    else if (token === "--skip-build") args.skipBuild = true;
    else if (token === "--skip-web") args.skipWeb = true;
    else if (token === "--skip-pack") args.skipPack = true;
    else if (token === "--skip-skill") args.skipSkill = true;
    else if (token === "--keep-artifacts") args.keepArtifacts = true;
    else throw new Error(`Unknown argument: ${token}`);
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootPackageJson = JSON.parse(
    await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  const version = rootPackageJson.version;
  console.log(`\n=== SwarmRecall release preflight — version ${version} ===\n`);

  if (!args.skipCheck) {
    await run("pnpm", ["check"], { cwd: repoRoot });
  }
  if (!args.skipTest) {
    await run("pnpm", ["-r", "test"], { cwd: repoRoot });
  }
  if (!args.skipBuild) {
    await run("pnpm", ["-r", "build"], { cwd: repoRoot });
  }
  if (!args.skipWeb) {
    await run("pnpm", ["--filter", "@swarmrecall/web", "build"], { cwd: repoRoot });
  }
  if (!args.skipSkill) {
    await run("node", [path.join(scriptDir, "check-clawhub-skill.mjs")], { cwd: repoRoot });
  }

  if (args.skipPack) {
    console.log("Skipping tarball pack + install smoke.");
    return;
  }

  const packDir = await fs.mkdtemp(path.join(os.tmpdir(), `swarmrecall-preflight-${version}-`));
  try {
    for (const pkg of PUBLIC_PACKAGES) {
      await run("pnpm", ["pack", "--pack-destination", packDir], {
        cwd: path.join(repoRoot, "packages", pkg),
      });
    }
    const files = await fs.readdir(packDir);
    console.log(`\nPacked tarballs in ${packDir}:`);
    for (const file of files) console.log(`  ${file}`);
    console.log("\n(Tarballs are the exact payload that `pnpm publish` will upload.)");
  } finally {
    if (!args.keepArtifacts) {
      await fs.rm(packDir, { recursive: true, force: true });
    } else {
      console.log(`\nKept artifacts in ${packDir}`);
    }
  }

  console.log("\n✓ Preflight checks passed.");
}

await main().catch((error) => {
  console.error(`\n✗ Preflight failed: ${error.message}`);
  process.exit(1);
});
