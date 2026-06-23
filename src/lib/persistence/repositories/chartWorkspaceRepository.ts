import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { chartWorkspaces } from "@/db/schema";
import type { ChartLayoutSnapshot } from "@/lib/persistence/schemas/chartWorkspace";
import { isUniqueViolation } from "@/lib/persistence/repositories/pgErrors";

export type ChartWorkspaceRecord = {
  id: string;
  workspaceName: string;
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  chartLayoutSnapshot: ChartLayoutSnapshot;
};

export type SaveChartWorkspaceInput = {
  userId: string;
  workspaceId: string;
  workspaceName?: string;
  chartLayoutSnapshot: ChartLayoutSnapshot;
  baseRevision: number;
};

export type SaveChartWorkspaceResult =
  | { ok: true; record: ChartWorkspaceRecord }
  | { ok: false; code: "not_found" | "conflict"; current?: ChartWorkspaceRecord };

function toRecord(row: typeof chartWorkspaces.$inferSelect): ChartWorkspaceRecord {
  return {
    id: row.id,
    workspaceName: row.workspaceName,
    schemaVersion: 1,
    syncRevision: row.syncRevision,
    updatedAt: row.updatedAt.toISOString(),
    chartLayoutSnapshot: row.chartLayoutSnapshot as ChartLayoutSnapshot,
  };
}

export async function getDefaultChartWorkspace(userId: string): Promise<ChartWorkspaceRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chartWorkspaces)
    .where(
      and(
        eq(chartWorkspaces.userId, userId),
        eq(chartWorkspaces.isDefault, true),
        isNull(chartWorkspaces.archivedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function createDefaultChartWorkspace(
  userId: string,
  chartLayoutSnapshot: ChartLayoutSnapshot,
  workspaceName = "Default",
): Promise<ChartWorkspaceRecord> {
  const db = getDb();
  const rows = await db
    .insert(chartWorkspaces)
    .values({
      userId,
      workspaceName,
      schemaVersion: 1,
      chartLayoutSnapshot,
      syncRevision: 1,
      isDefault: true,
    })
    .returning();

  return toRecord(rows[0]);
}

export async function getOrCreateDefaultChartWorkspace(
  userId: string,
  chartLayoutSnapshot: ChartLayoutSnapshot,
  workspaceName = "Default",
): Promise<ChartWorkspaceRecord> {
  const existing = await getDefaultChartWorkspace(userId);
  if (existing) {
    return existing;
  }

  try {
    return await createDefaultChartWorkspace(userId, chartLayoutSnapshot, workspaceName);
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const retry = await getDefaultChartWorkspace(userId);
    if (!retry) {
      throw error;
    }

    return retry;
  }
}

export async function getChartWorkspaceById(
  userId: string,
  workspaceId: string,
): Promise<ChartWorkspaceRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chartWorkspaces)
    .where(
      and(
        eq(chartWorkspaces.id, workspaceId),
        eq(chartWorkspaces.userId, userId),
        isNull(chartWorkspaces.archivedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function saveChartWorkspace(
  input: SaveChartWorkspaceInput,
): Promise<SaveChartWorkspaceResult> {
  const db = getDb();
  const existing = await getChartWorkspaceById(input.userId, input.workspaceId);
  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const rows = await db
    .update(chartWorkspaces)
    .set({
      workspaceName: input.workspaceName ?? existing.workspaceName,
      chartLayoutSnapshot: input.chartLayoutSnapshot,
      syncRevision: existing.syncRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(chartWorkspaces.id, input.workspaceId),
        eq(chartWorkspaces.userId, input.userId),
        eq(chartWorkspaces.syncRevision, input.baseRevision),
      ),
    )
    .returning();

  const row = rows[0];
  if (!row) {
    const current = await getChartWorkspaceById(input.userId, input.workspaceId);
    return { ok: false, code: "conflict", current: current ?? undefined };
  }

  return { ok: true, record: toRecord(row) };
}
