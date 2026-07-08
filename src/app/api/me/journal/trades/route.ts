import { NextResponse } from "next/server";

import { persistenceError } from "@/lib/persistence/common";
import { journalTradeListQuerySchema } from "@/lib/persistence/schemas/journal";
import { listJournalTrades } from "@/lib/persistence/repositories/journalRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = journalTradeListQuerySchema.safeParse({
    status: url.searchParams.get("status") ?? "all",
    symbol: url.searchParams.get("symbol") ?? undefined,
    secType: url.searchParams.get("secType") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return persistenceError(400, "validation", "Invalid journal trade query.", {
      details: parsed.error.flatten(),
    });
  }

  return withPersistenceAuth(async (userId) => {
    const trades = await listJournalTrades(userId, parsed.data);
    return NextResponse.json({ trades });
  });
}
