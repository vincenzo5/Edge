import { readLocalJournalSnapshot } from "@/lib/journal/localJournalStore";
import { tradeExecIdsKey } from "@/lib/journal/tradeExecIdsKey";
import {
  fetchJournalProviderTrades,
  fetchJournalTradeById,
  invalidateJournalPersistenceCache,
} from "@/lib/persistence/client/journalClient";

/**
 * Resolve the trade id that journal persistence APIs accept.
 * Handles stale client ids after server regroup by rematching fillExecIds.
 */
export async function resolveJournalTradeIdForPersistence(args: {
  tradeId: string;
  fillExecIds?: string[];
}): Promise<string | null> {
  const direct = await fetchJournalTradeById(args.tradeId);
  if (direct) return direct.id;

  const execKey = args.fillExecIds?.length ? tradeExecIdsKey(args.fillExecIds) : null;
  if (execKey) {
    invalidateJournalPersistenceCache();
    const trades = await fetchJournalProviderTrades();
    for (const trade of trades) {
      if (tradeExecIdsKey(trade.fillExecIds ?? []) === execKey) {
        return trade.id;
      }
    }

    const localByKey = readLocalJournalSnapshot().trades.find(
      (trade) => tradeExecIdsKey(trade.fillExecIds ?? []) === execKey,
    );
    if (localByKey) return localByKey.id;
  }

  const localById = readLocalJournalSnapshot().trades.find((trade) => trade.id === args.tradeId);
  return localById?.id ?? null;
}
