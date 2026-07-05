import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { chartWorkspaceCreateSchema } from "@/lib/persistence/schemas/chartWorkspace";
import {
  createChartWorkspace,
  listChartWorkspaces,
} from "@/lib/persistence/repositories/chartWorkspaceRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET() {
  return withPersistenceAuth(async (userId) => {
    const workspaces = await listChartWorkspaces(userId);

    return NextResponse.json({ workspaces });
  });
}

export async function POST(request: Request) {
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, chartWorkspaceCreateSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const workspace = await createChartWorkspace(
      userId,
      parsed.data.chartLayoutSnapshot,
      parsed.data.workspaceName,
      false,
    );

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
