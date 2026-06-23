import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { chartTemplateLibraryWriteSchema } from "@/lib/persistence/schemas/chartTemplateLibrary";
import {
  createChartTemplateLibrary,
  getChartTemplateLibrary,
  saveChartTemplateLibrary,
} from "@/lib/persistence/repositories/chartTemplateLibraryRepository";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

const EMPTY_TEMPLATE_SNAPSHOT = {
  version: 1 as const,
  presets: [],
};

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    let record = await getChartTemplateLibrary(userId);
    if (!record) {
      record = await createChartTemplateLibrary(userId, EMPTY_TEMPLATE_SNAPSHOT);
    }

    return NextResponse.json({
      schemaVersion: record.schemaVersion,
      syncRevision: record.syncRevision,
      updatedAt: record.updatedAt,
      templateSnapshot: record.templateSnapshot,
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

    const parsed = parseJsonBody(body, chartTemplateLibraryWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const result = await saveChartTemplateLibrary({
      userId,
      templateSnapshot: parsed.data.templateSnapshot,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      return conflictResponse({
        syncRevision: result.current.syncRevision,
        updatedAt: result.current.updatedAt,
        templateSnapshot: result.current.templateSnapshot,
      });
    }

    return NextResponse.json({
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      templateSnapshot: result.record.templateSnapshot,
    });
  });
}
