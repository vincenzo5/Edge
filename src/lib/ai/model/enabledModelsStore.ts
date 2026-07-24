import {
  EDGE_AI_DEFAULT_MODEL_FALLBACK,
  getModelRef,
  listSeedModelIds,
  modelSupportsVision,
  openRouterModelIdSchema,
} from "./allowlist";
import type { ModelRef } from "./types";

export const ENABLED_MODELS_STORAGE_KEY = "edge:ai:enabledModels:v1";

type EnabledModelsSnapshot = {
  modelIds: string[];
};

const catalogLabels = new Map<string, string>();
const listeners = new Set<() => void>();

let cachedEnabledIds: string[] | null = null;
let cachedEnabledModels: ModelRef[] | null = null;

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function notify(): void {
  cachedEnabledIds = null;
  cachedEnabledModels = null;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeEnabledModels(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCatalogModelLabels(models: Array<{ id: string; label: string }>): void {
  for (const model of models) {
    if (openRouterModelIdSchema.safeParse(model.id).success) {
      catalogLabels.set(model.id, model.label);
    }
  }
  notify();
}

function parseEnabledSnapshot(raw: unknown): string[] | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const modelIds = (raw as EnabledModelsSnapshot).modelIds;
  if (!Array.isArray(modelIds) || modelIds.length === 0) return null;
  const valid = modelIds.filter((id) => openRouterModelIdSchema.safeParse(id).success);
  return valid.length > 0 ? [...new Set(valid)] : null;
}

export function loadEnabledModelIds(): string[] {
  if (typeof window === "undefined") return listSeedModelIds();
  try {
    const raw = window.localStorage.getItem(ENABLED_MODELS_STORAGE_KEY);
    if (raw == null) return listSeedModelIds();
    const parsed = parseEnabledSnapshot(JSON.parse(raw));
    return parsed ?? listSeedModelIds();
  } catch {
    return listSeedModelIds();
  }
}

export function getEnabledModelIdsSnapshot(): string[] {
  const next = loadEnabledModelIds();
  if (cachedEnabledIds && arraysEqual(cachedEnabledIds, next)) {
    return cachedEnabledIds;
  }
  cachedEnabledIds = next;
  cachedEnabledModels = null;
  return cachedEnabledIds;
}

export function getEnabledAgentModelsSnapshot(): ModelRef[] {
  const ids = getEnabledModelIdsSnapshot();
  if (cachedEnabledModels) {
    return cachedEnabledModels;
  }
  cachedEnabledModels = ids
    .map((id) => getModelRef(id, catalogLabels.get(id)))
    .filter((model): model is ModelRef => model != null && model.capabilities.tools);
  return cachedEnabledModels;
}

export function saveEnabledModelIds(modelIds: string[]): void {
  if (typeof window === "undefined") return;
  const unique = [...new Set(modelIds.filter((id) => openRouterModelIdSchema.safeParse(id).success))];
  if (unique.length === 0) return;
  try {
    window.localStorage.setItem(ENABLED_MODELS_STORAGE_KEY, JSON.stringify({ modelIds: unique }));
    notify();
  } catch {
    /* quota / private mode */
  }
}

export function toggleEnabledModel(modelId: string, enabled: boolean): string[] {
  if (!openRouterModelIdSchema.safeParse(modelId).success) {
    return loadEnabledModelIds();
  }

  const current = loadEnabledModelIds();
  if (enabled) {
    if (current.includes(modelId)) return current;
    const next = [...current, modelId];
    saveEnabledModelIds(next);
    return next;
  }

  if (current.length <= 1) return current;
  const next = current.filter((id) => id !== modelId);
  saveEnabledModelIds(next);
  return next;
}

export function resetEnabledModelsToSeed(): string[] {
  const seed = listSeedModelIds();
  saveEnabledModelIds(seed);
  return seed;
}

export function listEnabledAgentModels(): ModelRef[] {
  return getEnabledAgentModelsSnapshot();
}

export function isModelEnabled(modelId: string): boolean {
  return loadEnabledModelIds().includes(modelId);
}

export function resolveEnabledModelId(preferredId?: string): string {
  const enabled = loadEnabledModelIds();
  const trimmed = preferredId?.trim();
  if (trimmed && enabled.includes(trimmed)) return trimmed;
  if (enabled.includes(EDGE_AI_DEFAULT_MODEL_FALLBACK)) return EDGE_AI_DEFAULT_MODEL_FALLBACK;
  return enabled[0] ?? EDGE_AI_DEFAULT_MODEL_FALLBACK;
}

export function resolveEnabledVisionModelId(preferredId?: string): string | null {
  const enabled = loadEnabledModelIds();
  const trimmed = preferredId?.trim();
  if (trimmed && enabled.includes(trimmed) && modelSupportsVision(trimmed)) {
    return trimmed;
  }
  return enabled.find((id) => modelSupportsVision(id)) ?? null;
}
