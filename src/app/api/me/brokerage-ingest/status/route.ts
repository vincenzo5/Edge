import { NextResponse } from "next/server";

import { listBrokerIngestStatus } from "@/lib/persistence/repositories/brokerIngestRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return withPersistenceAuth(async (userId) => {
    const cursors = await listBrokerIngestStatus(userId);
    return NextResponse.json({ cursors });
  });
}
