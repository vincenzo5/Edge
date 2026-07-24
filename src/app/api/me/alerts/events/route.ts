import { NextResponse } from "next/server";

import { persistenceError } from "@/lib/persistence/common";
import { listAlertTriggerEvents } from "@/lib/persistence/repositories/alertRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withPersistenceAuth(async (userId) => {
    const url = new URL(request.url);
    const alertId = url.searchParams.get("alertId")?.trim() || undefined;
    const events = await listAlertTriggerEvents(userId, alertId);
    return NextResponse.json({ events });
  });
}
