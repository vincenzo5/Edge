import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { journalScreenshotPatchSchema } from "@/lib/persistence/schemas/journal";
import {
  deleteJournalTradeScreenshot,
  patchJournalTradeScreenshot,
  readJournalTradeScreenshotBytes,
} from "@/lib/persistence/repositories/journalScreenshotRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; shotId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: tradeId, shotId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const payload = await readJournalTradeScreenshotBytes(userId, tradeId, shotId);
    if (!payload) {
      return persistenceError(404, "not_found", "Screenshot not found.");
    }
    return new NextResponse(new Uint8Array(payload.bytes), {
      status: 200,
      headers: {
        "Content-Type": payload.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: tradeId, shotId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, journalScreenshotPatchSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const screenshot = await patchJournalTradeScreenshot(userId, tradeId, shotId, parsed.data);
    if (!screenshot) {
      return persistenceError(404, "not_found", "Screenshot not found.");
    }
    return NextResponse.json(screenshot);
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: tradeId, shotId } = await context.params;
  return withPersistenceAuth(async (userId) => {
    const deleted = await deleteJournalTradeScreenshot(userId, tradeId, shotId);
    if (!deleted) {
      return persistenceError(404, "not_found", "Screenshot not found.");
    }
    return NextResponse.json({ ok: true });
  });
}
