import type { ApiKeyScope } from '@swarmrecall/shared';

export const EXPORT_MODULES = ['memory', 'knowledge', 'learnings', 'skills'] as const;

export type ExportModule = (typeof EXPORT_MODULES)[number];

const EXPORT_SCOPE_BY_MODULE: Record<ExportModule, ApiKeyScope> = {
  memory: 'memory.read',
  knowledge: 'knowledge.read',
  learnings: 'learnings.read',
  skills: 'skills.read',
};

export function parseExportModules(rawModules: string | undefined): ExportModule[] | null {
  if (!rawModules) {
    return [...EXPORT_MODULES];
  }

  const modules = rawModules
    .split(',')
    .map((moduleName) => moduleName.trim())
    .filter(Boolean);

  if (modules.length === 0) {
    return [...EXPORT_MODULES];
  }

  const normalized = Array.from(new Set(modules));
  if (!normalized.every((moduleName): moduleName is ExportModule => EXPORT_MODULES.includes(moduleName as ExportModule))) {
    return null;
  }

  return normalized;
}

export function getUnauthorizedExportModules(scopes: string[], modules: ExportModule[]): ExportModule[] {
  return modules.filter((moduleName) => !scopes.includes(EXPORT_SCOPE_BY_MODULE[moduleName]));
}

