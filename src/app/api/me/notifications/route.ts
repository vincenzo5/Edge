import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import {
  createNotificationSchema,
} from "@/lib/persistence/schemas/notifications";
import {
  countUnreadNotificationEvents,
  emitNotificationRecord,
  listNotificationEvents,
} from "@/lib/persistence/repositories/notificationRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const [notifications, unreadCount] = await Promise.all([
      listNotificationEvents(userId),
      countUnreadNotificationEvents(userId),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  });
}

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, createNotificationSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const dedupeKey =
      parsed.data.dedupeKey ??
      `${parsed.data.source}:${parsed.data.title}:${Math.floor(Date.now() / 1000)}`;

    const notification = await emitNotificationRecord({
      userId,
      source: parsed.data.source,
      title: parsed.data.title,
      body: parsed.data.body,
      href: parsed.data.href,
      dedupeKey,
    });

    if (!notification) {
      return NextResponse.json({ error: "Could not create notification." }, { status: 500 });
    }

    return NextResponse.json(notification, { status: 201 });
  });
}
