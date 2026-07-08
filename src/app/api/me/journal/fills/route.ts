import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { journalFillBatchSchema } from "@/lib/persistence/schemas/journal";
import {
  importJournalFillsAndRebuild,
  listJournalFills,
  upsertJournalFills,
} from "@/lib/persistence/repositories/journalRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const fills = await listJournalFills(userId);
    return NextResponse.json({ fills });
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

    const parsed = parseJsonBody(body, journalFillBatchSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    if (parsed.data.rebuildTrades) {
      const result = await importJournalFillsAndRebuild(userId, parsed.data.fills);
      return NextResponse.json(result);
    }

    const result = await upsertJournalFills(userId, parsed.data.fills);
    return NextResponse.json({
      ...result,
      skipped: 0,
      tradesRebuilt: 0,
    });
  });
}
