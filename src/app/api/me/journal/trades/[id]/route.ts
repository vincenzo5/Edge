import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { journalTradePatchSchema } from "@/lib/persistence/schemas/journal";
import {
  getJournalTradeById,
  patchJournalTrade,
} from "@/lib/persistence/repositories/journalRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const trade = await getJournalTradeById(userId, id);
    if (!trade) return persistenceError(404, "not_found", "Journal trade not found.");
    return NextResponse.json(trade);
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

    const parsed = parseJsonBody(body, journalTradePatchSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const trade = await patchJournalTrade(userId, id, parsed.data);
    if (!trade) return persistenceError(404, "not_found", "Journal trade not found.");
    return NextResponse.json(trade);
  });
}
