import { NextResponse } from "next/server";

import type { ScriptManifest } from "@edge/chart-core";
import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { saveScriptRevisionBodySchema } from "@/lib/persistence/schemas/scripts";
import { saveUserScriptRevision } from "@/lib/persistence/repositories/scriptsRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ scriptId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { scriptId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, saveScriptRevisionBodySchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    try {
      const result = await saveUserScriptRevision(userId, scriptId, {
        ...parsed.data,
        manifest: parsed.data.manifest as ScriptManifest | undefined,
      });
      if (!result) {
        return persistenceError(404, "not_found", `Script not found: ${scriptId}`);
      }
      return NextResponse.json({ script: result.entry, revision: result.revision });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save revision";
      return persistenceError(400, "validation", message);
    }
  });
}
