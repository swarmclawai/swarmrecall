import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_API_BASE_URL = "https://swarmrecall-api.onrender.com";

const CONFIG_DIR = join(homedir(), ".config", "swarmrecall");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface SwarmRecallConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface ResolvedClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "No SwarmRecall API key configured. Set SWARMRECALL_API_KEY or run: swarmrecall register --save",
    );
    this.name = "MissingApiKeyError";
  }
}

export function loadConfig(): SwarmRecallConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as SwarmRecallConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: SwarmRecallConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Resolve SwarmRecallClient options from environment variables, falling back
 * to the local config file. Throws MissingApiKeyError when no key is available.
 */
export function resolveClientOptions(): ResolvedClientOptions {
  const config = loadConfig();
  const apiKey = process.env.SWARMRECALL_API_KEY ?? config.apiKey;
  const baseUrl = process.env.SWARMRECALL_API_URL ?? config.baseUrl;
  if (!apiKey) throw new MissingApiKeyError();
  return baseUrl ? { apiKey, baseUrl } : { apiKey };
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
