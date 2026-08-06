import { dualWriteTemplateRules } from "@/lib/risk/policy/templatePersistence";

import type { PlaybookTemplate } from "./playbook/types";
import { PlaybookTemplateSchema } from "./playbook/types";
import { createUserPlaybookTemplateId } from "./playbook/resolveTemplate";
import type { PatchPlaybookTemplateInput } from "./playbookTemplateStore";

export function duplicateTemplateName(source: PlaybookTemplate): string {
  const suffix = " (copy)";
  const base = source.name.trim();
  if (base.endsWith(suffix)) return `${base} 2`;
  return `${base}${suffix}`;
}

/** Copy all slot fields when creating a user template from a preset or user source. */
export function userTemplateFromSource(
  source: PlaybookTemplate,
  options?: { name?: string; description?: string },
): PlaybookTemplate {
  return PlaybookTemplateSchema.parse({
    id: createUserPlaybookTemplateId(),
    name: options?.name?.trim() || duplicateTemplateName(source),
    description: options?.description?.trim() || source.description,
    rules: source.rules,
    schemaVersion: source.schemaVersion,
    scope: source.scope,
    budget: source.budget,
    sizing: source.sizing,
    geometry: source.geometry,
    exits: source.exits,
    gates: source.gates,
    defaultEntrySchedule: source.defaultEntrySchedule,
  });
}

/** Create a user-owned template from an inline definition (no preset source). */
export function userTemplateFromDefinition(
  definition: Omit<PlaybookTemplate, "id"> & { id?: string },
): PlaybookTemplate {
  return PlaybookTemplateSchema.parse({
    ...definition,
    id: createUserPlaybookTemplateId(),
    schemaVersion: definition.schemaVersion ?? 1,
    scope: definition.scope ?? "trade",
  });
}

export function applyPlaybookTemplatePatch(
  existing: PlaybookTemplate,
  patch: PatchPlaybookTemplateInput,
): PlaybookTemplate {
  const merged: PlaybookTemplate = {
    ...existing,
    ...(patch.name != null ? { name: patch.name } : {}),
    ...(patch.description != null ? { description: patch.description } : {}),
    ...(patch.rules != null ? { rules: patch.rules } : {}),
    ...(patch.schemaVersion != null ? { schemaVersion: patch.schemaVersion } : {}),
    ...(patch.scope != null ? { scope: patch.scope } : {}),
    ...(patch.budget !== undefined ? { budget: patch.budget } : {}),
    ...(patch.sizing !== undefined ? { sizing: patch.sizing } : {}),
    ...(patch.geometry !== undefined ? { geometry: patch.geometry } : {}),
    ...(patch.exits !== undefined ? { exits: patch.exits } : {}),
    ...(patch.gates !== undefined ? { gates: patch.gates } : {}),
    ...(patch.defaultEntrySchedule !== undefined
      ? { defaultEntrySchedule: patch.defaultEntrySchedule }
      : {}),
  };
  const rules =
    patch.exits !== undefined ? dualWriteTemplateRules(merged) : merged.rules;
  return PlaybookTemplateSchema.parse({ ...merged, rules });
}

/** Ensure exits/rules dual-write before persisting a full editor draft. */
export function finalizePlaybookTemplateForSave(template: PlaybookTemplate): PlaybookTemplate {
  const exits = template.exits ?? template.rules;
  const merged = { ...template, exits };
  const rules = dualWriteTemplateRules(merged);
  return PlaybookTemplateSchema.parse({
    ...merged,
    rules,
    schemaVersion: template.schemaVersion ?? 1,
    scope: template.scope ?? "trade",
  });
}

export function templateToPatchPayload(template: PlaybookTemplate): PatchPlaybookTemplateInput {
  const finalized = finalizePlaybookTemplateForSave(template);
  return {
    name: finalized.name,
    description: finalized.description,
    rules: finalized.rules,
    schemaVersion: finalized.schemaVersion,
    scope: finalized.scope,
    budget: finalized.budget,
    sizing: finalized.sizing,
    geometry: finalized.geometry,
    exits: finalized.exits,
    gates: finalized.gates,
    defaultEntrySchedule: finalized.defaultEntrySchedule,
  };
}
