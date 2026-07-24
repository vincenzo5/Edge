import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { patchNotificationSchema } from "@/lib/persistence/schemas/notifications";
import {
  dismissNotification,
  markNotificationRead,
} from "@/lib/persistence/repositories/notificationRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, patchNotificationSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const updated = parsed.data.dismiss
      ? await dismissNotification(userId, id)
      : await markNotificationRead(userId, id);

    if (!updated) {
      return persistenceError(404, "not_found", "Notification not found.");
    }

    return NextResponse.json(updated);
  });
}
