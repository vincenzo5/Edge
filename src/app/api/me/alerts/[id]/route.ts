import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { patchAlertSchema } from "@/lib/persistence/schemas/alerts";
import {
  deleteAlertDefinition,
  getAlertDefinition,
  updateAlertDefinition,
} from "@/lib/persistence/repositories/alertRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const alert = await getAlertDefinition(userId, id);
    if (!alert) {
      return persistenceError(404, "not_found", "Alert not found.");
    }
    return NextResponse.json(alert);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, patchAlertSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const alert = await updateAlertDefinition(userId, id, parsed.data);
    if (!alert) {
      return persistenceError(404, "not_found", "Alert not found.");
    }
    return NextResponse.json(alert);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const deleted = await deleteAlertDefinition(userId, id);
    if (!deleted) {
      return persistenceError(404, "not_found", "Alert not found.");
    }
    return NextResponse.json({ ok: true });
  });
}
