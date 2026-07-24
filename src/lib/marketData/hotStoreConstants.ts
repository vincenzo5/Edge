import type { CandleRequest } from "./contracts/equities";
import type { OptionsChainRequest } from "./contracts/options";
import { buildCacheKey } from "./cache/dataCache";

/** Freshness windows for stale-while-revalidate hot reads. */
export const HOT_FRESH_MS = {
  quote: 2_000,
  candles: 15_000,
  options_expirations: 10 * 60 * 1000,
  options_chain: 30_000,
} as const;

export const HOT_STALE_MS = {
  quote: 60_000,
  candles: 5 * 60 * 1000,
  options_expirations: 24 * 60 * 60 * 1000,
  options_chain: 5 * 60 * 1000,
} as const;

export function hotQuoteKey(symbol: string): string {
  return buildCacheKey(["hot", "quote", symbol.trim().toUpperCase()]);
}

export function hotCandlesKey(request: CandleRequest): string {
  return buildCacheKey([
    "hot",
    "candles",
    request.symbol.trim().toUpperCase(),
    request.range ?? "",
    request.interval,
    request.beforeTimestamp ?? "",
    request.barCount ?? "",
    request.sessionMode ?? "regular",
  ]);
}

export function hotOptionExpirationsKey(underlying: string): string {
  return buildCacheKey(["hot", "options-exp", underlying.trim().toUpperCase()]);
}

export function hotOptionsChainKey(
  underlying: string,
  expiration: string,
  strikeWindow?: OptionsChainRequest["strikeWindow"],
): string {
  const windowKey =
    !strikeWindow || strikeWindow.mode === "full"
      ? "full"
      : `atm:${strikeWindow.count ?? 20}:${strikeWindow.spot ?? "auto"}`;
  return buildCacheKey([
    "hot",
    "options-chain",
    underlying.trim().toUpperCase(),
    expiration,
    windowKey,
  ]);
}
