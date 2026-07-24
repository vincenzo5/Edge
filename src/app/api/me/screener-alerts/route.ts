import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { createScreenerAlertSchema } from "@/lib/persistence/schemas/screenerAlerts";
import {
  createScreenerAlertDefinition,
  listScreenerAlerts,
} from "@/lib/persistence/repositories/screenerAlertRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const screenerAlerts = await listScreenerAlerts(userId);
    return NextResponse.json({ screenerAlerts });
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

    const parsed = parseJsonBody(body, createScreenerAlertSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const alert = await createScreenerAlertDefinition(userId, parsed.data);
    return NextResponse.json(alert, { status: 201 });
  });
}
