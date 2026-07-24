import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { alertDefinitions, alertTriggerEvents } from "@/db/schema";
import {
  denormalizeFromConditions,
  expandCreateAlertInput,
  getSymbolStateEntry,
  syncPriceLegFromDenormalized,
} from "@/lib/alerts/alertConditions";
import type {
  AlertCondition,
  AlertConditionCombinator,
  AlertDefinitionResponse,
  AlertDrawingKind,
  AlertOperator,
  AlertRecurrence,
  AlertStatus,
  AlertSymbolState,
  AlertTriggerEventResponse,
} from "@/lib/persistence/schemas/alerts";
import {
  alertConditionSchema,
  alertSymbolStateSchema,
} from "@/lib/persistence/schemas/alerts";
import { PersistenceOwnershipError } from "@/lib/persistence/common";
import { getNotificationEventById } from "@/lib/persistence/repositories/notificationRepository";

function parseConditions(value: unknown): AlertCondition[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  return value.map((condition) => alertConditionSchema.parse(condition));
}

function parseSymbolState(value: unknown): AlertSymbolState {
  if (!value || typeof value !== "object") return {};
  return alertSymbolStateSchema.parse(value);
}

function rowToAlert(row: typeof alertDefinitions.$inferSelect): AlertDefinitionResponse {
  const parsedConditions = parseConditions(row.conditions);
  const conditions =
    parsedConditions.length > 0
      ? parsedConditions
      : [
          {
            kind: "price" as const,
            operator: row.operator as AlertOperator,
            price: row.price,
            priceHigh: row.priceHigh,
          },
        ];

  return {
    id: row.id,
    symbol: row.symbol,
    operator: row.operator as AlertOperator,
    price: row.price,
    message: row.message,
    recurrence: row.recurrence as AlertRecurrence,
    status: row.status as AlertStatus,
    cooldownMs: row.cooldownMs,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastPrice: row.lastPrice,
    lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
    drawingId: row.drawingId,
    drawingKind: (row.drawingKind as AlertDrawingKind | null) ?? null,
    priceHigh: row.priceHigh,
    tlT0: row.tlT0,
    tlV0: row.tlV0,
    tlT1: row.tlT1,
    tlV1: row.tlV1,
    tlExtendLeft: row.tlExtendLeft,
    tlExtendRight: row.tlExtendRight,
    drawingRole: (row.drawingRole as import("@/lib/persistence/schemas/alerts").AlertDrawingRole | null) ?? null,
    bundleId: row.bundleId,
    combinator: (row.combinator as AlertConditionCombinator | null) ?? null,
    conditions,
    watchlistId: row.watchlistId,
    symbolState: parseSymbolState(row.symbolState),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToTrigger(row: typeof alertTriggerEvents.$inferSelect): AlertTriggerEventResponse {
  return {
    id: row.id,
    alertId: row.alertId,
    symbol: row.symbol,
    operator: row.operator as AlertOperator,
    triggerPrice: row.triggerPrice,
    quotePrice: row.quotePrice,
    notificationId: row.notificationId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAlertDefinitions(userId: string): Promise<AlertDefinitionResponse[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(alertDefinitions)
    .where(eq(alertDefinitions.userId, userId))
    .orderBy(desc(alertDefinitions.updatedAt));
  return rows.map(rowToAlert);
}

export async function listActiveAlertDefinitions(): Promise<
  import("@/lib/persistence/schemas/alerts").ActiveAlertDefinition[]
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(alertDefinitions)
    .where(eq(alertDefinitions.status, "active"))
    .orderBy(asc(alertDefinitions.symbol));
  return rows.map((row) => ({
    ...rowToAlert(row),
    userId: row.userId,
  }));
}

export async function getAlertDefinition(
  userId: string,
  alertId: string,
): Promise<AlertDefinitionResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(alertDefinitions)
    .where(and(eq(alertDefinitions.userId, userId), eq(alertDefinitions.id, alertId)))
    .limit(1);
  const row = rows[0];
  return row ? rowToAlert(row) : null;
}

export async function createAlertDefinition(
  userId: string,
  input: {
    symbol?: string;
    watchlistId?: string;
    operator?: AlertOperator;
    price?: number;
    message?: string | null;
    recurrence?: AlertRecurrence;
    expiresAt?: string | null;
    combinator?: AlertConditionCombinator | null;
    conditions?: AlertCondition[];
    drawingId?: string;
    drawingKind?: AlertDrawingKind;
    priceHigh?: number | null;
    tlT0?: number | null;
    tlV0?: number | null;
    tlT1?: number | null;
    tlV1?: number | null;
    tlExtendLeft?: boolean | null;
    tlExtendRight?: boolean | null;
    drawingRole?: import("@/lib/persistence/schemas/alerts").AlertDrawingRole;
    bundleId?: string;
  },
): Promise<AlertDefinitionResponse> {
  const expanded = expandCreateAlertInput(input);
  const db = getDb();
  const rows = await db
    .insert(alertDefinitions)
    .values({
      userId,
      symbol: expanded.symbol,
      watchlistId: expanded.watchlistId,
      operator: expanded.operator,
      price: expanded.price,
      priceHigh: expanded.priceHigh,
      combinator: expanded.combinator,
      conditions: expanded.conditions,
      message: input.message?.trim() || null,
      recurrence: input.recurrence ?? "once",
      status: "active",
      drawingId: input.drawingId ?? null,
      drawingKind: input.drawingKind ?? null,
      tlT0: input.tlT0 ?? null,
      tlV0: input.tlV0 ?? null,
      tlT1: input.tlT1 ?? null,
      tlV1: input.tlV1 ?? null,
      tlExtendLeft: input.tlExtendLeft ?? null,
      tlExtendRight: input.tlExtendRight ?? null,
      drawingRole: input.drawingRole ?? null,
      bundleId: input.bundleId ?? null,
    })
    .returning();
  return rowToAlert(rows[0]);
}

export async function updateAlertDefinition(
  userId: string,
  alertId: string,
  patch: Partial<{
    symbol: string | null;
    watchlistId: string | null;
    operator: AlertOperator;
    price: number;
    message: string | null;
    recurrence: AlertRecurrence;
    status: AlertStatus;
    expiresAt: string | null;
    combinator: AlertConditionCombinator | null;
    conditions: AlertCondition[];
    drawingId: string | null;
    drawingKind: AlertDrawingKind | null;
    priceHigh: number | null;
    tlT0: number | null;
    tlV0: number | null;
    tlT1: number | null;
    tlV1: number | null;
    tlExtendLeft: boolean | null;
    tlExtendRight: boolean | null;
    drawingRole: import("@/lib/persistence/schemas/alerts").AlertDrawingRole | null;
    bundleId: string | null;
  }>,
): Promise<AlertDefinitionResponse | null> {
  const existing = await getAlertDefinition(userId, alertId);
  if (!existing) return null;

  const db = getDb();
  const values: Partial<typeof alertDefinitions.$inferInsert> = {
    updatedAt: new Date(),
  };

  let nextConditions = existing.conditions;

  if (patch.conditions !== undefined) {
    nextConditions = patch.conditions.map((condition) => alertConditionSchema.parse(condition));
    values.conditions = nextConditions;
  }

  if (patch.combinator !== undefined) values.combinator = patch.combinator;

  if (patch.symbol !== undefined) {
    values.symbol = patch.symbol ? patch.symbol.trim().toUpperCase() : "*";
  }
  if (patch.watchlistId !== undefined) values.watchlistId = patch.watchlistId;

  if (
    patch.operator !== undefined ||
    patch.price !== undefined ||
    patch.priceHigh !== undefined
  ) {
    nextConditions = syncPriceLegFromDenormalized(nextConditions, {
      operator: patch.operator,
      price: patch.price,
      priceHigh: patch.priceHigh,
    });
    values.conditions = nextConditions;
    const denormalized = denormalizeFromConditions(nextConditions);
    values.operator = patch.operator ?? denormalized.operator;
    values.price = patch.price ?? denormalized.price;
    if (patch.priceHigh !== undefined) values.priceHigh = patch.priceHigh;
    else values.priceHigh = denormalized.priceHigh;
  } else if (patch.conditions !== undefined) {
    const denormalized = denormalizeFromConditions(nextConditions);
    values.operator = denormalized.operator;
    values.price = denormalized.price;
    values.priceHigh = denormalized.priceHigh;
  }

  if (patch.message !== undefined) values.message = patch.message?.trim() || null;
  if (patch.recurrence !== undefined) values.recurrence = patch.recurrence;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.expiresAt !== undefined) {
    values.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
  }
  if (patch.drawingId !== undefined) values.drawingId = patch.drawingId;
  if (patch.drawingKind !== undefined) values.drawingKind = patch.drawingKind;
  if (patch.tlT0 !== undefined) values.tlT0 = patch.tlT0;
  if (patch.tlV0 !== undefined) values.tlV0 = patch.tlV0;
  if (patch.tlT1 !== undefined) values.tlT1 = patch.tlT1;
  if (patch.tlV1 !== undefined) values.tlV1 = patch.tlV1;
  if (patch.tlExtendLeft !== undefined) values.tlExtendLeft = patch.tlExtendLeft;
  if (patch.tlExtendRight !== undefined) values.tlExtendRight = patch.tlExtendRight;
  if (patch.drawingRole !== undefined) values.drawingRole = patch.drawingRole;
  if (patch.bundleId !== undefined) values.bundleId = patch.bundleId;

  const rows = await db
    .update(alertDefinitions)
    .set(values)
    .where(and(eq(alertDefinitions.userId, userId), eq(alertDefinitions.id, alertId)))
    .returning();
  const row = rows[0];
  return row ? rowToAlert(row) : null;
}

export async function deleteAlertDefinition(userId: string, alertId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(alertDefinitions)
    .where(and(eq(alertDefinitions.userId, userId), eq(alertDefinitions.id, alertId)))
    .returning({ id: alertDefinitions.id });
  return rows.length > 0;
}

export async function updateAlertDefinitionById(
  alertId: string,
  patch: Partial<{
    status: AlertStatus;
    lastPrice: number | null;
    lastFiredAt: string | null;
    price: number;
    priceHigh: number | null;
    tlT0: number | null;
    tlV0: number | null;
    tlT1: number | null;
    tlV1: number | null;
    symbolState: AlertSymbolState;
  }>,
): Promise<AlertDefinitionResponse | null> {
  const db = getDb();
  const values: Partial<typeof alertDefinitions.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.lastPrice !== undefined) values.lastPrice = patch.lastPrice;
  if (patch.lastFiredAt !== undefined) {
    values.lastFiredAt = patch.lastFiredAt ? new Date(patch.lastFiredAt) : null;
  }
  if (patch.price !== undefined) values.price = patch.price;
  if (patch.priceHigh !== undefined) values.priceHigh = patch.priceHigh;
  if (patch.tlT0 !== undefined) values.tlT0 = patch.tlT0;
  if (patch.tlV0 !== undefined) values.tlV0 = patch.tlV0;
  if (patch.tlT1 !== undefined) values.tlT1 = patch.tlT1;
  if (patch.tlV1 !== undefined) values.tlV1 = patch.tlV1;
  if (patch.symbolState !== undefined) values.symbolState = patch.symbolState;

  const rows = await db
    .update(alertDefinitions)
    .set(values)
    .where(eq(alertDefinitions.id, alertId))
    .returning();
  const row = rows[0];
  return row ? rowToAlert(row) : null;
}

export async function createAlertTriggerEvent(input: {
  userId: string;
  alertId: string;
  symbol: string;
  operator: AlertOperator;
  triggerPrice: number;
  quotePrice: number;
  notificationId?: string | null;
}): Promise<AlertTriggerEventResponse> {
  if (input.notificationId) {
    const notification = await getNotificationEventById(input.userId, input.notificationId);
    if (!notification) {
      throw new PersistenceOwnershipError("Notification not found or not owned by the user.");
    }
  }

  const db = getDb();
  const rows = await db
    .insert(alertTriggerEvents)
    .values({
      userId: input.userId,
      alertId: input.alertId,
      symbol: input.symbol,
      operator: input.operator,
      triggerPrice: input.triggerPrice,
      quotePrice: input.quotePrice,
      notificationId: input.notificationId ?? null,
    })
    .returning();
  return rowToTrigger(rows[0]);
}

export async function listAlertTriggerEvents(
  userId: string,
  alertId?: string,
): Promise<AlertTriggerEventResponse[]> {
  const db = getDb();
  const conditions = [eq(alertTriggerEvents.userId, userId)];
  if (alertId) conditions.push(eq(alertTriggerEvents.alertId, alertId));

  const rows = await db
    .select()
    .from(alertTriggerEvents)
    .where(and(...conditions))
    .orderBy(desc(alertTriggerEvents.createdAt))
    .limit(50);
  return rows.map(rowToTrigger);
}

export async function expireAlertsPastDue(now = new Date()): Promise<number> {
  const db = getDb();
  const rows = await db
    .update(alertDefinitions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        inArray(alertDefinitions.status, ["active", "paused"]),
        sql`${alertDefinitions.expiresAt} IS NOT NULL AND ${alertDefinitions.expiresAt} <= ${now}`,
      ),
    )
    .returning({ id: alertDefinitions.id });
  return rows.length;
}

export async function expireAlertsForBundleId(
  userId: string,
  bundleId: string,
  now = new Date(),
): Promise<number> {
  const db = getDb();
  const rows = await db
    .update(alertDefinitions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(alertDefinitions.userId, userId),
        eq(alertDefinitions.bundleId, bundleId),
        inArray(alertDefinitions.status, ["active", "paused"]),
      ),
    )
    .returning({ id: alertDefinitions.id });
  return rows.length;
}

export async function applyAlertScriptSnapshot(
  userId: string,
  alertId: string,
  input: { symbol: string; satisfied: boolean; barTime: number },
): Promise<AlertDefinitionResponse | null> {
  const existing = await getAlertDefinition(userId, alertId);
  if (!existing || existing.status !== "active") return null;

  const hasScriptLeg = existing.conditions.some((condition) => condition.kind === "script_condition");
  if (!hasScriptLeg) return null;

  const symbol = input.symbol.trim().toUpperCase();
  if (existing.watchlistId) return null;
  if (existing.symbol !== symbol && existing.symbol !== "*") return null;

  const symbolState = { ...(existing.symbolState ?? {}) };
  const entry = getSymbolStateEntry(symbolState, symbol);
  symbolState[symbol] = {
    ...entry,
    lastScriptSatisfied: input.satisfied,
    lastScriptBarTime: input.barTime,
    lastScriptSnapshotAt: new Date().toISOString(),
  };

  const db = getDb();
  const rows = await db
    .update(alertDefinitions)
    .set({
      symbolState,
      updatedAt: new Date(),
    })
    .where(and(eq(alertDefinitions.userId, userId), eq(alertDefinitions.id, alertId)))
    .returning();
  const row = rows[0];
  return row ? rowToAlert(row) : null;
}
