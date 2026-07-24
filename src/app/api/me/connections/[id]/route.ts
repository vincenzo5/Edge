import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { PatchConnectionSchema } from "@/lib/persistence/schemas/connections";
import {
  getConnection,
  updateConnection,
} from "@/lib/persistence/repositories/connectionsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const connection = await getConnection(userId, id);
    if (!connection) {
      return persistenceError(404, "not_found", "Connection not found.");
    }
    return NextResponse.json(connection);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, PatchConnectionSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const connection = await updateConnection(userId, id, parsed.data);
    if (!connection) {
      return persistenceError(404, "not_found", "Connection not found.");
    }
    return NextResponse.json(connection);
  });
}
