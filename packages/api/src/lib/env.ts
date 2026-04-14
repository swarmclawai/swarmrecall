import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_DATABASE_URL = 'postgresql://swarmrecall:swarmrecall@127.0.0.1:65432/swarmrecall';

let didLoadLocalEnv = false;

function findEnvFile(startDir: string): string | null {
  let currentDir = resolve(startDir);

  while (true) {
    const candidate = resolve(currentDir, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export function resolveLocalEnvPath(startDirs: string[] = [
  process.cwd(),
  dirname(fileURLToPath(import.meta.url)),
]): string | null {
  for (const startDir of startDirs) {
    const envPath = findEnvFile(startDir);
    if (envPath) {
      return envPath;
    }
  }

  return null;
}

export function loadLocalEnv(): void {
  if (didLoadLocalEnv) {
    return;
  }

  const envPath = resolveLocalEnvPath();

  if (envPath) {
    process.loadEnvFile(envPath);
  }

  didLoadLocalEnv = true;
}

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}
