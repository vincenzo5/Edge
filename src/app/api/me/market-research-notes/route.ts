import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { marketResearchNoteCreateSchema } from "@/lib/persistence/schemas/marketResearchNote";
import {
  createMarketResearchNote,
  listMarketResearchNotes,
} from "@/lib/persistence/repositories/marketResearchNotesRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.trim() || undefined;

  return withPersistenceAuth(async (userId) => {
    const notes = await listMarketResearchNotes(userId, symbol);
    return NextResponse.json({ notes });
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

    const parsed = parseJsonBody(body, marketResearchNoteCreateSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const note = await createMarketResearchNote({
      userId,
      chartWorkspaceId: parsed.data.chartWorkspaceId,
      symbol: parsed.data.symbol,
      chartInterval: parsed.data.chartInterval,
      researchNoteType: parsed.data.researchNoteType,
      chartDrawingSnapshot: parsed.data.chartDrawingSnapshot ?? null,
      researchThesis: parsed.data.researchThesis,
    });

    return NextResponse.json(note, { status: 201 });
  });
}
