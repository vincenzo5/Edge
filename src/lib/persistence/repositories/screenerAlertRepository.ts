import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { screenerAlerts } from "@/db/schema";
import type {
  ScreenerAlertDefinitionResponse,
  ScreenerAlertInterval,
  ScreenerAlertStatus,
} from "@/lib/persistence/schemas/screenerAlerts";

function rowToScreenerAlert(row: typeof screenerAlerts.$inferSelect): ScreenerAlertDefinitionResponse {
  const lastSymbols = Array.isArray(row.lastSymbols)
    ? (row.lastSymbols as string[])
    : [];

  return {
    id: row.id,
    screenId: row.screenId,
    intervalMinutes: row.intervalMinutes as ScreenerAlertInterval,
    notifyOn: "added",
    status: row.status as ScreenerAlertStatus,
    cooldownMs: row.cooldownMs,
    lastSymbols,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function computeNextRunAt(intervalMinutes: ScreenerAlertInterval, from = new Date()): Date {
  return new Date(from.getTime() + intervalMinutes * 60_000);
}

export async function listScreenerAlerts(userId: string): Promise<ScreenerAlertDefinitionResponse[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(screenerAlerts)
    .where(eq(screenerAlerts.userId, userId))
    .orderBy(asc(screenerAlerts.screenId));
  return rows.map(rowToScreenerAlert);
}

export async function getScreenerAlertByScreenId(
  userId: string,
  screenId: string,
): Promise<ScreenerAlertDefinitionResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(screenerAlerts)
    .where(and(eq(screenerAlerts.userId, userId), eq(screenerAlerts.screenId, screenId)))
    .limit(1);
  const row = rows[0];
  return row ? rowToScreenerAlert(row) : null;
}

export async function createScreenerAlertDefinition(
  userId: string,
  input: {
    screenId: string;
    intervalMinutes: ScreenerAlertInterval;
  },
): Promise<ScreenerAlertDefinitionResponse> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .insert(screenerAlerts)
    .values({
      userId,
      screenId: input.screenId.trim(),
      intervalMinutes: input.intervalMinutes,
      status: "active",
      nextRunAt: now,
      lastSymbols: [],
    })
    .returning();
  return rowToScreenerAlert(rows[0]);
}

export async function updateScreenerAlertDefinition(
  userId: string,
  alertId: string,
  patch: Partial<{
    intervalMinutes: ScreenerAlertInterval;
    status: ScreenerAlertStatus;
    lastSymbols: string[];
    lastRunAt: string | null;
    nextRunAt: string | null;
    lastFiredAt: string | null;
  }>,
): Promise<ScreenerAlertDefinitionResponse | null> {
  const db = getDb();
  const values: Partial<typeof screenerAlerts.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.intervalMinutes !== undefined) values.intervalMinutes = patch.intervalMinutes;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.lastSymbols !== undefined) values.lastSymbols = patch.lastSymbols;
  if (patch.lastRunAt !== undefined) {
    values.lastRunAt = patch.lastRunAt ? new Date(patch.lastRunAt) : null;
  }
  if (patch.nextRunAt !== undefined) {
    values.nextRunAt = patch.nextRunAt ? new Date(patch.nextRunAt) : null;
  }
  if (patch.lastFiredAt !== undefined) {
    values.lastFiredAt = patch.lastFiredAt ? new Date(patch.lastFiredAt) : null;
  }

  const rows = await db
    .update(screenerAlerts)
    .set(values)
    .where(and(eq(screenerAlerts.userId, userId), eq(screenerAlerts.id, alertId)))
    .returning();
  const row = rows[0];
  return row ? rowToScreenerAlert(row) : null;
}

export async function deleteScreenerAlertDefinition(
  userId: string,
  alertId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(screenerAlerts)
    .where(and(eq(screenerAlerts.userId, userId), eq(screenerAlerts.id, alertId)))
    .returning({ id: screenerAlerts.id });
  return rows.length > 0;
}

export async function listDueScreenerAlerts(now = new Date()) {
  const db = getDb();
  const rows = await db
    .select()
    .from(screenerAlerts)
    .where(
      and(
        eq(screenerAlerts.status, "active"),
        sql`${screenerAlerts.nextRunAt} IS NOT NULL AND ${screenerAlerts.nextRunAt} <= ${now}`,
      ),
    )
    .orderBy(asc(screenerAlerts.nextRunAt));
  return rows.map((row) => ({
    ...rowToScreenerAlert(row),
    userId: row.userId,
  }));
}

export async function updateScreenerAlertById(
  alertId: string,
  patch: Partial<{
    lastSymbols: string[];
    lastRunAt: string | null;
    nextRunAt: string | null;
    lastFiredAt: string | null;
  }>,
): Promise<ScreenerAlertDefinitionResponse | null> {
  const db = getDb();
  const values: Partial<typeof screenerAlerts.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.lastSymbols !== undefined) values.lastSymbols = patch.lastSymbols;
  if (patch.lastRunAt !== undefined) {
    values.lastRunAt = patch.lastRunAt ? new Date(patch.lastRunAt) : null;
  }
  if (patch.nextRunAt !== undefined) {
    values.nextRunAt = patch.nextRunAt ? new Date(patch.nextRunAt) : null;
  }
  if (patch.lastFiredAt !== undefined) {
    values.lastFiredAt = patch.lastFiredAt ? new Date(patch.lastFiredAt) : null;
  }

  const rows = await db
    .update(screenerAlerts)
    .set(values)
    .where(eq(screenerAlerts.id, alertId))
    .returning();
  const row = rows[0];
  return row ? rowToScreenerAlert(row) : null;
}
