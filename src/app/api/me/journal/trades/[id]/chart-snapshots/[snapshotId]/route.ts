import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { journalChartSnapshotPatchSchema } from "@/lib/persistence/schemas/journal";
import {
  deleteJournalTradeChartSnapshot,
  getJournalTradeChartSnapshotById,
  patchJournalTradeChartSnapshot,
} from "@/lib/persistence/repositories/journalChartSnapshotRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; snapshotId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: tradeId, snapshotId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const snapshot = await getJournalTradeChartSnapshotById(userId, tradeId, snapshotId);
    if (!snapshot) {
      return persistenceError(404, "not_found", "Chart snapshot not found.");
    }
    return NextResponse.json(snapshot);
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: tradeId, snapshotId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, journalChartSnapshotPatchSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    try {
      const snapshot = await patchJournalTradeChartSnapshot(
        userId,
        tradeId,
        snapshotId,
        parsed.data,
      );
      if (!snapshot) {
        return persistenceError(404, "not_found", "Chart snapshot not found.");
      }
      return NextResponse.json(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chart snapshot update failed.";
      return persistenceError(400, "validation", message);
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: tradeId, snapshotId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const deleted = await deleteJournalTradeChartSnapshot(userId, tradeId, snapshotId);
    if (!deleted) {
      return persistenceError(404, "not_found", "Chart snapshot not found.");
    }
    return NextResponse.json({ ok: true });
  });
}
