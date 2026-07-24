import { NextResponse } from "next/server";

import type { ScriptManifest } from "@edge/chart-core";
import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { patchScriptBodySchema } from "@/lib/persistence/schemas/scripts";
import {
  deleteUserScript,
  getUserScriptEntry,
  patchUserScript,
} from "@/lib/persistence/repositories/scriptsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ scriptId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { scriptId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const script = await getUserScriptEntry(userId, scriptId);
    if (!script) {
      return persistenceError(404, "not_found", `Script not found: ${scriptId}`);
    }
    return NextResponse.json({ script });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { scriptId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, patchScriptBodySchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    try {
      const script = await patchUserScript(userId, scriptId, {
        ...parsed.data,
        draftManifest: parsed.data.draftManifest as ScriptManifest | undefined,
      });
      if (!script) {
        return persistenceError(404, "not_found", `Script not found: ${scriptId}`);
      }
      return NextResponse.json({ script });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update script";
      return persistenceError(400, "validation", message);
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { scriptId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const deleted = await deleteUserScript(userId, scriptId);
    if (!deleted) {
      return persistenceError(404, "not_found", `Script not found: ${scriptId}`);
    }
    return NextResponse.json({ deletedScriptId: scriptId });
  });
}
