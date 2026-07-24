import { NextResponse } from "next/server";

import {
  isPersistenceDatabaseUnavailable,
  isPersistenceOwnershipError,
  parseJsonBody,
  persistenceError,
} from "@/lib/persistence/common";
import { journalChartSnapshotCreateSchema } from "@/lib/persistence/schemas/journal";
import {
  createJournalTradeChartSnapshot,
  listJournalTradeChartSnapshots,
} from "@/lib/persistence/repositories/journalChartSnapshotRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: tradeId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const snapshots = await listJournalTradeChartSnapshots(userId, tradeId);
    return NextResponse.json({ snapshots });
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { id: tradeId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, journalChartSnapshotCreateSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    try {
      const snapshot = await createJournalTradeChartSnapshot(userId, tradeId, parsed.data);
      if (!snapshot) {
        return persistenceError(404, "not_found", "Journal trade not found.");
      }
      return NextResponse.json(snapshot, { status: 201 });
    } catch (error) {
      if (isPersistenceOwnershipError(error)) {
        return persistenceError(400, "validation", error.message);
      }
      if (isPersistenceDatabaseUnavailable(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Chart snapshot create failed.";
      return persistenceError(400, "validation", message);
    }
  });
}
