import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { chartTemplateLibrary } from "@/db/schema";
import type { TemplateSnapshot } from "@/lib/persistence/schemas/chartTemplateLibrary";

export type ChartTemplateLibraryRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  templateSnapshot: TemplateSnapshot;
};

export type SaveChartTemplateLibraryInput = {
  userId: string;
  templateSnapshot: TemplateSnapshot;
  baseRevision: number;
};

export type SaveChartTemplateLibraryResult =
  | { ok: true; record: ChartTemplateLibraryRecord }
  | { ok: false; code: "conflict"; current: ChartTemplateLibraryRecord };

const EMPTY_TEMPLATE_SNAPSHOT: TemplateSnapshot = {
  version: 1,
  presets: [],
};

function toRecord(row: typeof chartTemplateLibrary.$inferSelect): ChartTemplateLibraryRecord {
  return {
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    templateSnapshot: row.templateSnapshot as TemplateSnapshot,
  };
}

export async function getChartTemplateLibrary(
  userId: string,
): Promise<ChartTemplateLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chartTemplateLibrary)
    .where(eq(chartTemplateLibrary.userId, userId))
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createChartTemplateLibrary(
  userId: string,
  templateSnapshot: TemplateSnapshot = EMPTY_TEMPLATE_SNAPSHOT,
): Promise<ChartTemplateLibraryRecord> {
  const db = getDb();
  const rows = await db
    .insert(chartTemplateLibrary)
    .values({
      userId,
      schemaVersion: 1,
      templateSnapshot,
      syncRevision: 1,
    })
    .returning();

  return toRecord(rows[0]);
}

async function insertChartTemplateLibraryIfAbsent(
  userId: string,
  templateSnapshot: TemplateSnapshot,
): Promise<ChartTemplateLibraryRecord | null> {
  const db = getDb();
  const rows = await db
    .insert(chartTemplateLibrary)
    .values({
      userId,
      schemaVersion: 1,
      templateSnapshot,
      syncRevision: 1,
    })
    .onConflictDoNothing()
    .returning();

  return rows[0] ? toRecord(rows[0]) : null;
}

export async function saveChartTemplateLibrary(
  input: SaveChartTemplateLibraryInput,
): Promise<SaveChartTemplateLibraryResult> {
  const db = getDb();
  const existing = await getChartTemplateLibrary(input.userId);
  if (!existing) {
    const created = await insertChartTemplateLibraryIfAbsent(input.userId, input.templateSnapshot);
    if (created) {
      if (input.baseRevision !== 0) {
        return { ok: false, code: "conflict", current: created };
      }
      return { ok: true, record: created };
    }

    const current = await getChartTemplateLibrary(input.userId);
    if (!current) {
      throw new Error("Failed to create chart template library");
    }

    return { ok: false, code: "conflict", current };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const rows = await db
    .update(chartTemplateLibrary)
    .set({
      templateSnapshot: input.templateSnapshot,
      syncRevision: existing.syncRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(chartTemplateLibrary.userId, input.userId),
        eq(chartTemplateLibrary.syncRevision, input.baseRevision),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    const current = await getChartTemplateLibrary(input.userId);
    return { ok: false, code: "conflict", current: current ?? existing };
  }

  return { ok: true, record: toRecord(row) };
}
