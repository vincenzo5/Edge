import { NextResponse } from "next/server";

import {
  disconnectConnection,
  getConnection,
} from "@/lib/persistence/repositories/connectionsRepository";
import { persistenceError } from "@/lib/persistence/common";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const existing = await getConnection(userId, id);
    if (!existing) {
      return persistenceError(404, "not_found", "Connection not found.");
    }

    const connection = await disconnectConnection(userId, id);
    return NextResponse.json({
      ok: true,
      connection,
      message: "Connection marked disconnected. Runtime sidecar topology is unchanged.",
    });
  });
}
