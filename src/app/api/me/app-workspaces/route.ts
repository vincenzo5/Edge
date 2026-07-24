import { NextResponse } from "next/server";

import { createDefaultWorkspacesState } from "@/lib/appWorkspace/storage";
import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { appWorkspacesLibraryWriteSchema } from "@/lib/persistence/schemas/appWorkspaces";
import {
  createAppWorkspacesLibrary,
  getAppWorkspacesLibrary,
  saveAppWorkspacesLibrary,
} from "@/lib/persistence/repositories/appWorkspacesRepository";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    let record = await getAppWorkspacesLibrary(userId);
    if (!record) {
      record = await createAppWorkspacesLibrary(userId, createDefaultWorkspacesState());
    }

    return NextResponse.json({
      schemaVersion: record.schemaVersion,
      syncRevision: record.syncRevision,
      updatedAt: record.updatedAt,
      appWorkspacesSnapshot: record.appWorkspacesSnapshot,
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

    const parsed = parseJsonBody(body, appWorkspacesLibraryWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const result = await saveAppWorkspacesLibrary({
      userId,
      appWorkspacesSnapshot: parsed.data.appWorkspacesSnapshot,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      return conflictResponse({
        syncRevision: result.current.syncRevision,
        updatedAt: result.current.updatedAt,
        appWorkspacesSnapshot: result.current.appWorkspacesSnapshot,
      });
    }

    return NextResponse.json({
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      appWorkspacesSnapshot: result.record.appWorkspacesSnapshot,
    });
  });
}
