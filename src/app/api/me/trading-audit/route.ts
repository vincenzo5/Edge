import { NextResponse } from "next/server";

import {
  listTradingAuditEvents,
  normalizeTradingAuditListLimit,
} from "@/lib/persistence/repositories/tradingAuditRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";
import { purgeTradingAuditRetentionNow } from "@/lib/trading/tradingAuditPersist";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withPersistenceAuth(async (userId) => {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = normalizeTradingAuditListLimit(
      limitParam ? Number.parseInt(limitParam, 10) : undefined,
    );

    await purgeTradingAuditRetentionNow();

    const events = await listTradingAuditEvents(userId, { limit });
    return NextResponse.json({ events });
  });
}
