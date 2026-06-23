import type { MarketResearchNoteResponse } from "@/lib/persistence/schemas/marketResearchNote";
import { persistenceFetch } from "@/lib/persistence/client/persistenceFetch";

export type CreateMarketResearchNoteInput = {
  chartWorkspaceId?: string;
  symbol: string;
  chartInterval: string;
  researchNoteType: "thesis" | "invalidation" | "target" | "note";
  chartDrawingSnapshot?: Record<string, unknown>;
  researchThesis: {
    title?: string;
    body?: string;
    confidence?: number;
    tags?: string[];
  };
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchMarketResearchNotes(
  symbol?: string,
): Promise<MarketResearchNoteResponse[]> {
  const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  const response = await persistenceFetch(`/api/me/market-research-notes${query}`, {
    method: "GET",
  });

  if (response.status === 503) return [];
  if (!response.ok) return [];

  const body = await parseJsonResponse<{ notes: MarketResearchNoteResponse[] }>(response);
  return body?.notes ?? [];
}

export async function createMarketResearchNoteRemote(
  input: CreateMarketResearchNoteInput,
): Promise<MarketResearchNoteResponse | null> {
  const response = await persistenceFetch("/api/me/market-research-notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) return null;
  return parseJsonResponse<MarketResearchNoteResponse>(response);
}
