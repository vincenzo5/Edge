import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { patchScreenerAlertSchema } from "@/lib/persistence/schemas/screenerAlerts";
import {
  deleteScreenerAlertDefinition,
  listScreenerAlerts,
  updateScreenerAlertDefinition,
} from "@/lib/persistence/repositories/screenerAlertRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const rows = await listScreenerAlerts(userId);
    const alert = rows.find((row) => row.id === id) ?? null;
    if (!alert) {
      return persistenceError(404, "not_found", "Screener alert not found.");
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

    const parsed = parseJsonBody(body, patchScreenerAlertSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const alert = await updateScreenerAlertDefinition(userId, id, parsed.data);
    if (!alert) {
      return persistenceError(404, "not_found", "Screener alert not found.");
    }
    return NextResponse.json(alert);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const deleted = await deleteScreenerAlertDefinition(userId, id);
    if (!deleted) {
      return persistenceError(404, "not_found", "Screener alert not found.");
    }
    return NextResponse.json({ ok: true });
  });
}
