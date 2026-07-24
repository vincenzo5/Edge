import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { postAlertSnapshotSchema } from "@/lib/persistence/schemas/alerts";
import { applyAlertScriptSnapshot } from "@/lib/persistence/repositories/alertRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, postAlertSnapshotSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const alert = await applyAlertScriptSnapshot(userId, id, parsed.data);
    if (!alert) {
      return persistenceError(404, "not_found", "Alert not found or snapshot not accepted.");
    }
    return NextResponse.json(alert);
  });
}
