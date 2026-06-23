import { NextResponse } from "next/server";

import { parseJsonBody, persistenceError } from "@/lib/persistence/common";
import { marketResearchNotePatchSchema } from "@/lib/persistence/schemas/marketResearchNote";
import {
  getMarketResearchNoteById,
  patchMarketResearchNote,
} from "@/lib/persistence/repositories/marketResearchNotesRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withPersistenceAuth(async (userId) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return persistenceError(400, "validation", "Request body must be valid JSON.");
    }

    const parsed = parseJsonBody(body, marketResearchNotePatchSchema);
    if (!parsed.ok) {
      return persistenceError(400, "validation", parsed.error, { details: parsed.details });
    }

    const existing = await getMarketResearchNoteById(userId, id);
    if (!existing) {
      return persistenceError(404, "not_found", "Research note not found.");
    }

    const note = await patchMarketResearchNote({
      userId,
      noteId: id,
      chartWorkspaceId: parsed.data.chartWorkspaceId,
      symbol: parsed.data.symbol,
      chartInterval: parsed.data.chartInterval,
      researchNoteType: parsed.data.researchNoteType,
      chartDrawingSnapshot: parsed.data.chartDrawingSnapshot,
      researchThesis: parsed.data.researchThesis,
      archived: parsed.data.archived,
    });

    if (!note) {
      return persistenceError(404, "not_found", "Research note not found.");
    }

    return NextResponse.json(note);
  });
}
