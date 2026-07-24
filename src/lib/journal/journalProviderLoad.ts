import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

export function mergeJournalProviderTrades(
  openTrades: JournalTradeResponse[],
  closedTrades: JournalTradeResponse[],
): JournalTradeResponse[] {
  const byId = new Map<string, JournalTradeResponse>();
  for (const trade of openTrades) {
    byId.set(trade.id, trade);
  }
  for (const trade of closedTrades) {
    byId.set(trade.id, trade);
  }
  return [...byId.values()];
}

export function collectFillExecIds(trades: JournalTradeResponse[]): string[] {
  const execIds = new Set<string>();
  for (const trade of trades) {
    for (const execId of trade.fillExecIds ?? []) {
      if (execId.trim()) {
        execIds.add(execId);
      }
    }
  }
  return [...execIds];
}

export function fillAccountIndexToMap(
  entries: ReadonlyArray<{ execId: string; account: string | null }>,
): ReadonlyMap<string, string | null> {
  return new Map(entries.map((entry) => [entry.execId, entry.account?.trim() ?? null]));
}
