import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { playbookTemplates } from "@/db/schema";
import { dualWriteTemplateRules } from "@/lib/risk/policy/templatePersistence";
import {
  PlaybookTemplateSchema,
  type PlaybookTemplate,
} from "@/lib/trading/playbook/types";
import {
  createUserPlaybookTemplateId,
  isUserPlaybookTemplateId,
} from "@/lib/trading/playbook/resolveTemplate";
import { getPlaybookPreset } from "@/lib/trading/playbook/presets";
import type {
  CreatePlaybookTemplateInput,
  PatchPlaybookTemplateInput,
} from "@/lib/trading/playbookTemplateStore";

function rowToTemplate(row: typeof playbookTemplates.$inferSelect): PlaybookTemplate {
  return PlaybookTemplateSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    rules: row.rules,
    schemaVersion: row.schemaVersion === 1 ? 1 : undefined,
    scope: row.scope === "trade" ? "trade" : undefined,
    budget: row.budget ?? undefined,
    sizing: row.sizing ?? undefined,
    geometry: row.geometry ?? undefined,
    exits: row.exits ?? undefined,
    gates: row.gates ?? undefined,
    defaultEntrySchedule: row.defaultEntrySchedule ?? undefined,
  });
}

function templateToRowValues(template: PlaybookTemplate) {
  return {
    name: template.name,
    description: template.description,
    rules: dualWriteTemplateRules(template),
    schemaVersion: template.schemaVersion ?? 1,
    scope: template.scope ?? "trade",
    budget: template.budget ?? null,
    sizing: template.sizing ?? null,
    geometry: template.geometry ?? null,
    exits: template.exits ?? null,
    gates: template.gates ?? null,
    defaultEntrySchedule: template.defaultEntrySchedule ?? null,
  };
}

function duplicateTemplateName(source: PlaybookTemplate): string {
  const suffix = " (copy)";
  const base = source.name.trim();
  if (base.endsWith(suffix)) return `${base} 2`;
  return `${base}${suffix}`;
}

async function resolveSourceTemplate(
  userId: string,
  sourceTemplateId: string,
): Promise<PlaybookTemplate | null> {
  const preset = getPlaybookPreset(sourceTemplateId);
  if (preset) return preset;
  return findPlaybookTemplateById(userId, sourceTemplateId);
}

export async function listPlaybookTemplates(userId: string): Promise<PlaybookTemplate[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookTemplates)
    .where(eq(playbookTemplates.userId, userId))
    .orderBy(sql`${playbookTemplates.name} ASC`);
  return rows.map(rowToTemplate);
}

export async function findPlaybookTemplateById(
  userId: string,
  id: string,
): Promise<PlaybookTemplate | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(playbookTemplates)
    .where(and(eq(playbookTemplates.userId, userId), eq(playbookTemplates.id, id)))
    .limit(1);
  return rows[0] ? rowToTemplate(rows[0]) : null;
}

export async function insertPlaybookTemplate(
  userId: string,
  input: CreatePlaybookTemplateInput,
): Promise<PlaybookTemplate> {
  const source = await resolveSourceTemplate(userId, input.sourceTemplateId);
  if (!source) {
    throw new Error(`Unknown source template: ${input.sourceTemplateId}`);
  }
  const template = PlaybookTemplateSchema.parse({
    id: createUserPlaybookTemplateId(),
    name: input.name?.trim() || duplicateTemplateName(source),
    description: input.description?.trim() || source.description,
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
  const db = getDb();
  const now = new Date();
  await db.insert(playbookTemplates).values({
    id: template.id,
    userId,
    ...templateToRowValues(template),
    createdAt: now,
    updatedAt: now,
  });
  return template;
}

export async function patchPlaybookTemplate(
  userId: string,
  id: string,
  patch: PatchPlaybookTemplateInput,
): Promise<PlaybookTemplate | null> {
  if (!isUserPlaybookTemplateId(id)) return null;
  const existing = await findPlaybookTemplateById(userId, id);
  if (!existing) return null;
  const updated = PlaybookTemplateSchema.parse({
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
  });
  const db = getDb();
  await db
    .update(playbookTemplates)
    .set({
      ...templateToRowValues(updated),
      updatedAt: new Date(),
    })
    .where(and(eq(playbookTemplates.userId, userId), eq(playbookTemplates.id, id)));
  return updated;
}

export async function duplicatePlaybookTemplate(
  userId: string,
  id: string,
): Promise<PlaybookTemplate | null> {
  const source =
    getPlaybookPreset(id) ?? (await findPlaybookTemplateById(userId, id));
  if (!source) return null;
  return insertPlaybookTemplate(userId, {
    sourceTemplateId: source.id,
    name: duplicateTemplateName(source),
    description: source.description,
  });
}

export async function deletePlaybookTemplate(userId: string, id: string): Promise<boolean> {
  if (!isUserPlaybookTemplateId(id)) return false;
  const db = getDb();
  const rows = await db
    .delete(playbookTemplates)
    .where(and(eq(playbookTemplates.userId, userId), eq(playbookTemplates.id, id)))
    .returning({ id: playbookTemplates.id });
  return rows.length > 0;
}
