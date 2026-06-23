import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { marketResearchNotes } from "@/db/schema";
import type {
  MarketResearchNoteResponse,
} from "@/lib/persistence/schemas/marketResearchNote";

export type CreateMarketResearchNoteInput = {
  userId: string;
  chartWorkspaceId?: string;
  symbol: string;
  chartInterval: string;
  researchNoteType: string;
  chartDrawingSnapshot?: Record<string, unknown> | null;
  researchThesis: Record<string, unknown>;
};

export type PatchMarketResearchNoteInput = {
  userId: string;
  noteId: string;
  chartWorkspaceId?: string | null;
  symbol?: string;
  chartInterval?: string;
  researchNoteType?: string;
  chartDrawingSnapshot?: Record<string, unknown> | null;
  researchThesis?: Record<string, unknown>;
  archived?: boolean;
};

function toResponse(row: typeof marketResearchNotes.$inferSelect): MarketResearchNoteResponse {
  return {
    id: row.id,
    chartWorkspaceId: row.chartWorkspaceId,
    symbol: row.symbol,
    chartInterval: row.chartInterval,
    researchNoteType: row.researchNoteType as MarketResearchNoteResponse["researchNoteType"],
    chartDrawingSnapshot:
      row.chartDrawingSnapshot as MarketResearchNoteResponse["chartDrawingSnapshot"],
    researchThesis: row.researchThesis as MarketResearchNoteResponse["researchThesis"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}

export async function listMarketResearchNotes(
  userId: string,
  symbol?: string,
): Promise<MarketResearchNoteResponse[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(marketResearchNotes)
    .where(
      symbol
        ? and(
            eq(marketResearchNotes.userId, userId),
            eq(marketResearchNotes.symbol, symbol.toUpperCase()),
            isNull(marketResearchNotes.archivedAt),
          )
        : and(eq(marketResearchNotes.userId, userId), isNull(marketResearchNotes.archivedAt)),
    );

  return rows.map(toResponse);
}

export async function createMarketResearchNote(
  input: CreateMarketResearchNoteInput,
): Promise<MarketResearchNoteResponse> {
  const db = getDb();
  const rows = await db
    .insert(marketResearchNotes)
    .values({
      userId: input.userId,
      chartWorkspaceId: input.chartWorkspaceId ?? null,
      symbol: input.symbol.toUpperCase(),
      chartInterval: input.chartInterval,
      researchNoteType: input.researchNoteType,
      chartDrawingSnapshot: input.chartDrawingSnapshot ?? null,
      researchThesis: input.researchThesis,
    })
    .returning();

  return toResponse(rows[0]);
}

export async function getMarketResearchNoteById(
  userId: string,
  noteId: string,
): Promise<MarketResearchNoteResponse | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(marketResearchNotes)
    .where(and(eq(marketResearchNotes.id, noteId), eq(marketResearchNotes.userId, userId)))
    .limit(1);

  const row = rows[0];
  return row ? toResponse(row) : null;
}

export async function patchMarketResearchNote(
  input: PatchMarketResearchNoteInput,
): Promise<MarketResearchNoteResponse | null> {
  const db = getDb();
  const existing = await getMarketResearchNoteById(input.userId, input.noteId);
  if (!existing) return null;

  const rows = await db
    .update(marketResearchNotes)
    .set({
      chartWorkspaceId:
        input.chartWorkspaceId !== undefined ? input.chartWorkspaceId : existing.chartWorkspaceId,
      symbol: input.symbol ? input.symbol.toUpperCase() : existing.symbol,
      chartInterval: input.chartInterval ?? existing.chartInterval,
      researchNoteType: input.researchNoteType ?? existing.researchNoteType,
      chartDrawingSnapshot:
        input.chartDrawingSnapshot !== undefined
          ? input.chartDrawingSnapshot
          : existing.chartDrawingSnapshot,
      researchThesis: input.researchThesis ?? existing.researchThesis,
      archivedAt: input.archived ? new Date() : existing.archivedAt ? new Date(existing.archivedAt) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(marketResearchNotes.id, input.noteId), eq(marketResearchNotes.userId, input.userId)))
    .returning();

  const row = rows[0];
  return row ? toResponse(row) : null;
}
