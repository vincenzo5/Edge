import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { notificationEvents } from "@/db/schema";
import { shouldSuppressNotificationDedupe } from "@/lib/notifications/dedupe";
import type { EmitNotificationInput, NotificationEvent } from "@/lib/notifications/types";
import type { NotificationEventResponse } from "@/lib/persistence/schemas/notifications";
import { sanitizeHref } from "@/lib/security/safeHref";

function rowToResponse(row: typeof notificationEvents.$inferSelect): NotificationEventResponse {
  return {
    id: row.id,
    source: row.source as NotificationEventResponse["source"],
    title: row.title,
    body: row.body,
    href: row.href,
    dedupeKey: row.dedupeKey,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
  };
}

export async function listNotificationEvents(
  userId: string,
  options: { includeDismissed?: boolean; limit?: number } = {},
): Promise<NotificationEventResponse[]> {
  const db = getDb();
  const limit = options.limit ?? 50;
  const conditions = [eq(notificationEvents.userId, userId)];
  if (!options.includeDismissed) {
    conditions.push(isNull(notificationEvents.dismissedAt));
  }

  const rows = await db
    .select()
    .from(notificationEvents)
    .where(and(...conditions))
    .orderBy(desc(notificationEvents.createdAt))
    .limit(limit);

  return rows.map(rowToResponse);
}

export async function countUnreadNotificationEvents(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationEvents)
    .where(
      and(
        eq(notificationEvents.userId, userId),
        isNull(notificationEvents.readAt),
        isNull(notificationEvents.dismissedAt),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function getNotificationEventById(
  userId: string,
  notificationId: string,
): Promise<NotificationEventResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(notificationEvents)
    .where(and(eq(notificationEvents.id, notificationId), eq(notificationEvents.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? rowToResponse(row) : null;
}

export async function findRecentNotificationByDedupeKey(
  userId: string,
  dedupeKey: string,
): Promise<NotificationEventResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(notificationEvents)
    .where(and(eq(notificationEvents.userId, userId), eq(notificationEvents.dedupeKey, dedupeKey)))
    .orderBy(desc(notificationEvents.createdAt))
    .limit(1);
  const row = rows[0];
  return row ? rowToResponse(row) : null;
}

export async function emitNotificationRecord(
  input: EmitNotificationInput,
): Promise<NotificationEvent | null> {
  const existing = await findRecentNotificationByDedupeKey(input.userId, input.dedupeKey);
  if (existing && shouldSuppressNotificationDedupe(existing.createdAt)) {
    return existing;
  }

  const db = getDb();
  const rows = await db
    .insert(notificationEvents)
    .values({
      userId: input.userId,
      source: input.source,
      title: input.title.trim(),
      body: input.body.trim(),
      href: sanitizeHref(input.href),
      dedupeKey: input.dedupeKey,
    })
    .returning();

  return rowToResponse(rows[0]);
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<NotificationEventResponse | null> {
  const db = getDb();
  const rows = await db
    .update(notificationEvents)
    .set({ readAt: new Date() })
    .where(and(eq(notificationEvents.id, notificationId), eq(notificationEvents.userId, userId)))
    .returning();
  const row = rows[0];
  return row ? rowToResponse(row) : null;
}

export async function dismissNotification(
  userId: string,
  notificationId: string,
): Promise<NotificationEventResponse | null> {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .update(notificationEvents)
    .set({
      dismissedAt: now,
      readAt: sql`COALESCE(${notificationEvents.readAt}, ${now})`,
    })
    .where(and(eq(notificationEvents.id, notificationId), eq(notificationEvents.userId, userId)))
    .returning();
  const row = rows[0];
  return row ? rowToResponse(row) : null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .update(notificationEvents)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationEvents.userId, userId),
        isNull(notificationEvents.readAt),
        isNull(notificationEvents.dismissedAt),
      ),
    )
    .returning({ id: notificationEvents.id });
  return rows.length;
}
