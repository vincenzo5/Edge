import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { createAlertSchema } from "@/lib/persistence/schemas/alerts";
import {
  createAlertDefinition,
  listAlertDefinitions,
} from "@/lib/persistence/repositories/alertRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const alerts = await listAlertDefinitions(userId);
    return NextResponse.json({ alerts });
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

    const parsed = parseJsonBody(body, createAlertSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const alert = await createAlertDefinition(userId, parsed.data);
    return NextResponse.json(alert, { status: 201 });
  });
}
