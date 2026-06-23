import { NextResponse } from "next/server";

import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { watchlistLibraryWriteSchema } from "@/lib/persistence/schemas/watchlistLibrary";
import {
  createWatchlistLibrary,
  getWatchlistLibrary,
  saveWatchlistLibrary,
} from "@/lib/persistence/repositories/watchlistLibraryRepository";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    let record = await getWatchlistLibrary(userId);
    if (!record) {
      record = await createWatchlistLibrary(userId, DEFAULT_WATCHLIST_STATE);
    }

    return NextResponse.json({
      schemaVersion: record.schemaVersion,
      syncRevision: record.syncRevision,
      updatedAt: record.updatedAt,
      watchlistSnapshot: record.watchlistSnapshot,
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

    const parsed = parseJsonBody(body, watchlistLibraryWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const result = await saveWatchlistLibrary({
      userId,
      watchlistSnapshot: parsed.data.watchlistSnapshot,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      return conflictResponse({
        syncRevision: result.current.syncRevision,
        updatedAt: result.current.updatedAt,
        watchlistSnapshot: result.current.watchlistSnapshot,
      });
    }

    return NextResponse.json({
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      watchlistSnapshot: result.record.watchlistSnapshot,
    });
  });
}
