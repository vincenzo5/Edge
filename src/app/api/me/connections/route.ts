import { NextResponse } from "next/server";

import { listConnections } from "@/lib/persistence/repositories/connectionsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const connections = await listConnections(userId);
    return NextResponse.json({ connections });
  });
}
