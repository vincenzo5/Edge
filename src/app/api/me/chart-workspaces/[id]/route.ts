import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { chartWorkspaceWriteSchema } from "@/lib/persistence/schemas/chartWorkspace";
import {
  archiveChartWorkspace,
  getChartWorkspaceById,
  saveChartWorkspace,
} from "@/lib/persistence/repositories/chartWorkspaceRepository";
import {
  conflictResponse,
  withPersistenceAuth,
} from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    const workspace = await getChartWorkspaceById(userId, id);
    if (!workspace) {
      return persistenceError(404, "not_found", "Chart workspace not found.");
    }

    return NextResponse.json({
      id: workspace.id,
      workspaceName: workspace.workspaceName,
      schemaVersion: workspace.schemaVersion,
      syncRevision: workspace.syncRevision,
      updatedAt: workspace.updatedAt,
      chartLayoutSnapshot: workspace.chartLayoutSnapshot,
    });
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, chartWorkspaceWriteSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const existing = await getChartWorkspaceById(userId, id);
    if (!existing) {
      return persistenceError(404, "not_found", "Chart workspace not found.");
    }

    const result = await saveChartWorkspace({
      userId,
      workspaceId: id,
      workspaceName: parsed.data.workspaceName,
      chartLayoutSnapshot: parsed.data.chartLayoutSnapshot,
      baseRevision: parsed.data.baseRevision,
    });

    if (!result.ok) {
      if (result.code === "not_found") {
        return persistenceError(404, "not_found", "Chart workspace not found.");
      }
      if (result.current) {
        return conflictResponse({
          syncRevision: result.current.syncRevision,
          updatedAt: result.current.updatedAt,
          chartLayoutSnapshot: result.current.chartLayoutSnapshot,
        });
      }
      return persistenceError(409, "conflict", "Revision conflict.");
    }

    return NextResponse.json({
      id: result.record.id,
      workspaceName: result.record.workspaceName,
      schemaVersion: result.record.schemaVersion,
      syncRevision: result.record.syncRevision,
      updatedAt: result.record.updatedAt,
      chartLayoutSnapshot: result.record.chartLayoutSnapshot,
    });
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    const result = await archiveChartWorkspace(userId, id);
    if (!result.ok) {
      if (result.code === "not_found") {
        return persistenceError(404, "not_found", "Chart workspace not found.");
      }
      return persistenceError(409, "conflict", "Cannot archive the last workspace.");
    }

    return NextResponse.json({ ok: true });
  });
}
