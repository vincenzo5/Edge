import type { JournalTradePatch, JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import {
  fetchJournalTradeById,
  fetchJournalTrades,
  patchJournalTradeRemote,
} from "@/lib/persistence/client/journalClient";

export type JournalTradeListQuery = {
  status?: "open" | "closed" | "all";
  symbol?: string;
  secType?: string;
  tag?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type JournalTradeReviewPatch = Pick<
  JournalTradePatch,
  "tags" | "setup" | "reviewNote" | "plannedRiskMode" | "plannedRiskValue" | "rating" | "ignored"
>;

export type JournalPort = {
  listTrades: (query?: JournalTradeListQuery) => Promise<JournalTradeResponse[]>;
  getTrade: (id: string) => Promise<JournalTradeResponse | null>;
  patchTrade: (
    id: string,
    patch: JournalTradeReviewPatch,
  ) => Promise<JournalTradeResponse | null>;
};

export function createFetchJournalPort(): JournalPort {
  return {
    listTrades: (query) => fetchJournalTrades(query ?? {}),
    getTrade: (id) => fetchJournalTradeById(id),
    patchTrade: (id, patch) => patchJournalTradeRemote(id, patch),
  };
}
