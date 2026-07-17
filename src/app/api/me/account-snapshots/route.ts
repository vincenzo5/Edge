import { NextResponse } from "next/server";

import { listAccountSnapshots } from "@/lib/persistence/repositories/accountSnapshotRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return withPersistenceAuth(async (userId) => {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId") ?? undefined;
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const snapshots = await listAccountSnapshots(userId, {
      accountId,
      from,
      to,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ snapshots });
  });
}
