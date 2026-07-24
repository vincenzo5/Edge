import { CACHE_TTL_MS } from "./ttlPolicy";

/** Client-side TTL cache namespaces aligned with server `CACHE_TTL_MS`. */
export type ClientCacheNamespace =
  | "search"
  | "fundamentals"
  | "events"
  | "news"
  | "options_expirations"
  | "market_context"
  | "quotes"
  | "ai_candles"
  | "journal_trades"
  | "journal_fills"
  | "pattern_library_records";

/**
 * Per-namespace client max-age. Values mirror server TTLs (client max-age <= server).
 * Phase 1 consumers read these when calling `ClientTtlCache.set`.
 */
export const CLIENT_CACHE_TTL_MS: Record<ClientCacheNamespace, number> = {
  search: CACHE_TTL_MS.search,
  fundamentals: CACHE_TTL_MS.fundamentals,
  events: CACHE_TTL_MS.events,
  news: CACHE_TTL_MS.news,
  options_expirations: CACHE_TTL_MS.options_expirations,
  market_context: CACHE_TTL_MS.market_context,
  quotes: CACHE_TTL_MS.quotes,
  /** Default fallback; AI port passes `candleCacheTtlMs(interval)` per request. */
  ai_candles: CACHE_TTL_MS.quotes,
  /** Session memo for `/api/me/journal/trades` remount reuse (Phase 6). */
  journal_trades: 15_000,
  /** Session memo for `/api/me/journal/fills` remount reuse (Phase 6). */
  journal_fills: 15_000,
  /** Session memo for pattern library record list (Phase 6). */
  pattern_library_records: 60_000,
};

/**
 * Dataset classes that must never enter `ClientTtlCache` or durable browser storage.
 * Live quote streams use `MarketDataProvider`; trading/brokerage paths stay uncached.
 */
export const CLIENT_CACHE_DO_NOT_CACHE = [
  "live_quote_sse_ticks",
  "brokerage_account_snapshots",
  "order_previews",
  "order_submits",
  "trading_readiness",
  "ingest_cron_responses",
  "auth_session_payloads",
] as const;

export type ClientCacheDoNotCacheReason = (typeof CLIENT_CACHE_DO_NOT_CACHE)[number];

/** Build a stable cache key: `{namespace}|{part1}|{part2}|…` */
export function buildClientCacheKey(namespace: ClientCacheNamespace, parts: string[]): string {
  return [namespace, ...parts].join("|");
}

/** Normalize symbol search query for cache keys (Phase 1). */
export function normalizeClientCacheQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Normalize equity symbol for cache keys (Phase 1). */
export function normalizeClientCacheSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function buildJournalTradesCacheKey(query: {
  status?: "open" | "closed" | "all";
  symbol?: string;
  secType?: string;
  tag?: string;
} = {}): string {
  return buildClientCacheKey("journal_trades", [
    query.status ?? "all",
    query.symbol ? normalizeClientCacheSymbol(query.symbol) : "",
    query.secType ? query.secType.trim().toUpperCase() : "",
    query.tag ?? "",
  ]);
}

export const JOURNAL_FILLS_CACHE_KEY = buildClientCacheKey("journal_fills", ["all"]);

export const PATTERN_LIBRARY_RECORDS_CACHE_KEY = buildClientCacheKey("pattern_library_records", [
  "list",
]);
