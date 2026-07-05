import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { chartWorkspaces } from "@/db/schema";
import type { ChartLayoutSnapshot } from "@/lib/persistence/schemas/chartWorkspace";
import { isUniqueViolation } from "@/lib/persistence/repositories/pgErrors";

export type ChartWorkspaceSummary = {
  id: string;
  workspaceName: string;
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  isDefault: boolean;
  chartLayoutSnapshot: ChartLayoutSnapshot;
};

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

function toSummary(row: typeof chartWorkspaces.$inferSelect): ChartWorkspaceSummary {
  return {
    ...toRecord(row),
    isDefault: row.isDefault,
  };
}

export async function listChartWorkspaces(userId: string): Promise<ChartWorkspaceSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chartWorkspaces)
    .where(and(eq(chartWorkspaces.userId, userId), isNull(chartWorkspaces.archivedAt)))
    .orderBy(desc(chartWorkspaces.updatedAt));

  return rows.map(toSummary);
}

export async function createChartWorkspace(
  userId: string,
  chartLayoutSnapshot: ChartLayoutSnapshot,
  workspaceName: string,
  isDefault = false,
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
      isDefault,
    })
    .returning();

  return toRecord(rows[0]!);
}

export type ArchiveChartWorkspaceResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "default_required" };

export async function archiveChartWorkspace(
  userId: string,
  workspaceId: string,
): Promise<ArchiveChartWorkspaceResult> {
  const existing = await getChartWorkspaceById(userId, workspaceId);
  if (!existing) {
    return { ok: false, code: "not_found" };
  }

  const active = await listChartWorkspaces(userId);
  if (active.length <= 1) {
    return { ok: false, code: "default_required" };
  }

  const db = getDb();
  await db
    .update(chartWorkspaces)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(chartWorkspaces.id, workspaceId), eq(chartWorkspaces.userId, userId)));

  return { ok: true };
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
