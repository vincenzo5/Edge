import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { userPreferencesLibraryWriteSchema } from "@/lib/persistence/schemas/userPreferences";
import {
  createUserPreferencesLibrary,
  getUserPreferencesLibrary,
  saveUserPreferencesLibrary,
} from "@/lib/persistence/repositories/userPreferencesRepository";
import { createDefaultUserPreferencesSnapshot } from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    let record = await getUserPreferencesLibrary(userId);
    if (!record) {
      record = await createUserPreferencesLibrary(
        userId,
        createDefaultUserPreferencesSnapshot(),
      );
    }

    return NextResponse.json({
      schemaVersion: record.schemaVersion,
      syncRevision: record.syncRevision,
      updatedAt: record.updatedAt,
      preferencesSnapshot: record.preferencesSnapshot,
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

    const parsed = parseJsonBody(body, userPreferencesLibraryWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const result = await saveUserPreferencesLibrary({
      userId,
      preferencesSnapshot: parsed.data.preferencesSnapshot,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      return conflictResponse({
        syncRevision: result.current.syncRevision,
        updatedAt: result.current.updatedAt,
        preferencesSnapshot: result.current.preferencesSnapshot,
      });
    }

    return NextResponse.json({
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      preferencesSnapshot: result.record.preferencesSnapshot,
    });
  });
}
