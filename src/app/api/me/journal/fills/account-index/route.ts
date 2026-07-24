import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { journalFillAccountIndexQuerySchema } from "@/lib/persistence/schemas/journal";
import { listJournalFillAccountIndex } from "@/lib/persistence/repositories/journalRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, journalFillAccountIndexQuerySchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const entries = await listJournalFillAccountIndex(userId, parsed.data.execIds);
    return NextResponse.json({ entries });
  });
}
