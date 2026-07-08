import { NextResponse } from "next/server";

import { rebuildJournalTrades } from "@/lib/persistence/repositories/journalRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function POST() {
  return withPersistenceAuth(async (userId) => {
    const result = await rebuildJournalTrades(userId);
    return NextResponse.json(result);
  });
}
