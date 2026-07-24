import {
  buildJournalTradesCacheKey,
  JOURNAL_FILLS_CACHE_KEY,
  PATTERN_LIBRARY_RECORDS_CACHE_KEY,
} from "@/lib/marketData/cache/clientCachePolicy";
import { getSharedClientTtlCache } from "@/lib/marketData/cache/clientTtlCache";

const JOURNAL_TRADES_PREFIX = "journal_trades|";

/** Bust journal trades/fills session memo after ledger or trade mutations. */
export function invalidateJournalPersistenceCache(): void {
  const cache = getSharedClientTtlCache();
  cache.invalidateByPrefix(JOURNAL_TRADES_PREFIX);
  cache.invalidate(JOURNAL_FILLS_CACHE_KEY);
}

/** Bust pattern library list memo after capture or metadata edits. */
export function invalidatePatternLibraryRecordsCache(): void {
  getSharedClientTtlCache().invalidate(PATTERN_LIBRARY_RECORDS_CACHE_KEY);
}

export { buildJournalTradesCacheKey, JOURNAL_FILLS_CACHE_KEY, PATTERN_LIBRARY_RECORDS_CACHE_KEY };
