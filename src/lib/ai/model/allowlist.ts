import { z } from "zod";

import { modelRefSchema, type ModelRef } from "./types";

/** Fallback when EDGE_AI_DEFAULT_MODEL is unset. Must stay on the seed allowlist. */
export const EDGE_AI_DEFAULT_MODEL_FALLBACK = "x-ai/grok-4.5" as const;

/** OpenRouter model id format: vendor/model-slug */
export const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i;

export const openRouterModelIdSchema = z
  .string()
  .min(1)
  .regex(OPENROUTER_MODEL_ID_PATTERN, {
    message: "modelId must be a valid OpenRouter id (vendor/model)",
  });

/** @deprecated Use openRouterModelIdSchema — kept for existing imports. */
export const allowedModelIdSchema = openRouterModelIdSchema;

/**
 * Seed defaults verified for tool-calling via OpenRouter.
 * Used as the initial enabled set in Copilot model settings.
 */
export const EDGE_AI_MODEL_ALLOWLIST: readonly ModelRef[] = [
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6",
    provider: "openrouter",
    capabilities: { tools: true, vision: true },
  },
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    provider: "openrouter",
    capabilities: { tools: true, vision: true },
  },
  {
    id: "anthropic/claude-fable-5",
    label: "Claude Fable 5",
    provider: "openrouter",
    capabilities: { tools: true, vision: true },
  },
  {
    id: EDGE_AI_DEFAULT_MODEL_FALLBACK,
    label: "Grok 4.5",
    provider: "openrouter",
    capabilities: { tools: true, vision: true },
  },
  {
    id: "z-ai/glm-5.2",
    label: "GLM 5.2",
    provider: "openrouter",
    capabilities: { tools: true, vision: false },
  },
] as const;

const seedById = new Map(EDGE_AI_MODEL_ALLOWLIST.map((model) => [model.id, model]));

export function formatOpenRouterModelLabel(modelId: string): string {
  const slug = modelId.split("/")[1] ?? modelId;
  return slug
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getModelRef(modelId: string, labelOverride?: string): ModelRef | undefined {
  if (!openRouterModelIdSchema.safeParse(modelId).success) {
    return undefined;
  }

  const seed = seedById.get(modelId);
  if (seed) return seed;

  return {
    id: modelId,
    label: labelOverride ?? formatOpenRouterModelLabel(modelId),
    provider: "openrouter",
    capabilities: { tools: true, vision: false },
  };
}

export function modelSupportsVision(modelId: string): boolean {
  const ref = getModelRef(modelId);
  return ref?.capabilities.vision === true;
}

export function listVisionCapableSeedModelIds(): string[] {
  return EDGE_AI_MODEL_ALLOWLIST.filter((model) => model.capabilities.vision).map(
    (model) => model.id,
  );
}

export function listSeedModelIds(): string[] {
  return EDGE_AI_MODEL_ALLOWLIST.map((model) => model.id);
}

export function listAllowedModels(): ModelRef[] {
  return [...EDGE_AI_MODEL_ALLOWLIST];
}

/** Tool-capable seed models (legacy helper for tests and defaults). */
export function listAgentModels(): ModelRef[] {
  return listAllowedModels().filter((model) => model.capabilities.tools);
}

export function getDefaultModelId(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.EDGE_AI_DEFAULT_MODEL?.trim();
  if (configured) {
    return resolveAllowedModelId(configured);
  }
  return EDGE_AI_DEFAULT_MODEL_FALLBACK;
}

export function resolveAllowedModelId(modelId?: string, env: NodeJS.ProcessEnv = process.env): string {
  const resolved = modelId?.trim() || getDefaultModelId(env);
  openRouterModelIdSchema.parse(resolved);
  return resolved;
}

export function parseModelRef(value: unknown): ModelRef {
  return modelRefSchema.parse(value);
}
