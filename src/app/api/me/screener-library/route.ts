import { NextResponse } from "next/server";

import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";
import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { screenerLibraryWriteSchema } from "@/lib/persistence/schemas/screenerLibrary";
import {
  createScreenerLibrary,
  getScreenerLibrary,
  saveScreenerLibrary,
} from "@/lib/persistence/repositories/screenerLibraryRepository";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    let record = await getScreenerLibrary(userId);
    if (!record) {
      record = await createScreenerLibrary(userId, DEFAULT_SCREENER_STATE);
    }

    return NextResponse.json({
      schemaVersion: record.schemaVersion,
      syncRevision: record.syncRevision,
      updatedAt: record.updatedAt,
      screenerSnapshot: record.screenerSnapshot,
    });
  });
}

export async function PUT(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, screenerLibraryWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const result = await saveScreenerLibrary({
      userId,
      screenerSnapshot: parsed.data.screenerSnapshot,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      return conflictResponse({
        syncRevision: result.current.syncRevision,
        updatedAt: result.current.updatedAt,
        screenerSnapshot: result.current.screenerSnapshot,
      });
    }

    return NextResponse.json({
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      screenerSnapshot: result.record.screenerSnapshot,
    });
  });
}
