import { NextResponse } from "next/server";

import { toPublicErrorMessage } from "@/lib/api/safeErrorResponse";
import {
  getConnection,
  updateConnection,
} from "@/lib/persistence/repositories/connectionsRepository";
import { persistenceError } from "@/lib/persistence/common";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";
import { isTwsConfigured } from "@/lib/marketData/providers/tws/client";
import { recoverTwsSidecar } from "@/lib/marketData/providers/tws/recover";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const connection = await getConnection(userId, id);
    if (!connection) {
      return persistenceError(404, "not_found", "Connection not found.");
    }

    if (connection.kind !== "ib_gateway_sidecar") {
      return persistenceError(400, "validation", "Reconnect is not supported for this connection kind.");
    }

    if (!isTwsConfigured()) {
      return persistenceError(403, "validation", "TWS is not configured.");
    }

    try {
      const result = await recoverTwsSidecar([]);
      const nextStatus =
        result.ok && result.status.gatewayConnected
          ? "connected"
          : result.ok
            ? "degraded"
            : "disconnected";
      const updated = await updateConnection(userId, id, { status: nextStatus });
      return NextResponse.json({
        ok: result.ok,
        message: result.message,
        connection: updated,
        recovery: {
          commandState: result.commandState,
          action: result.action,
          recoveryPhase: result.recoveryPhase,
          status: result.status,
        },
      });
    } catch (error) {
      const message = toPublicErrorMessage(error, "TWS recovery failed");
      const statusCode = message.includes("not configured") ? 403 : 500;
      return NextResponse.json({ ok: false, error: message }, { status: statusCode });
    }
  });
}
