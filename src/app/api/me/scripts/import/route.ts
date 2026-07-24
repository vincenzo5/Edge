import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { scriptLibrarySnapshotSchema } from "@/lib/persistence/schemas/scriptLibrary";
import {
  importScriptLibraryEntries,
  listUserScripts,
} from "@/lib/persistence/repositories/scriptsRepository";
import { importLegacyScriptLibrarySnapshot } from "@/lib/persistence/repositories/scriptsLegacyImport";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";
import type { ScriptLibraryEntry } from "@/lib/scriptLibrary/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, scriptLibrarySnapshotSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    await importLegacyScriptLibrarySnapshot(userId);
    const imported = await importScriptLibraryEntries(
      userId,
      parsed.data.scripts as ScriptLibraryEntry[],
    );
    const scripts = await listUserScripts(userId);
    return NextResponse.json({ imported, scripts });
  });
}
