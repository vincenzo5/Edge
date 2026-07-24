import "server-only";

import type { CandleRequest, CandleResponse, EquityQuote } from "./contracts/equities";
import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "./contracts/options";
import { globalHotStore } from "./cache/serverCacheBackends";
import {
  HOT_FRESH_MS,
  HOT_STALE_MS,
  hotCandlesKey,
  hotOptionExpirationsKey,
  hotOptionsChainKey,
  hotQuoteKey,
} from "./hotStoreConstants";

export function clearHotStoreForTests(): void {
  void Promise.resolve(globalHotStore.clear());
}

export function invalidateHotRecoveryKeys(args: {
  symbols: string[];
  candleRequests: CandleRequest[];
}): void {
  const keys: string[] = [];
  for (const sym of args.symbols) {
    keys.push(hotQuoteKey(sym));
  }
  for (const request of args.candleRequests) {
    keys.push(hotCandlesKey(request));
  }
  if (keys.length > 0) {
    void Promise.resolve(globalHotStore.invalidate(keys));
  }
}

export function invalidateHotDisplayDataCaches(): void {
  void Promise.resolve(globalHotStore.invalidateDisplayDataCaches());
}

export function writeHotQuote(
  quote: EquityQuote,
  source: string,
  warnings: string[] = [],
): void {
  void Promise.resolve(
    globalHotStore.write(hotQuoteKey(quote.symbol), quote, {
      source,
      freshMs: HOT_FRESH_MS.quote,
      staleMs: HOT_STALE_MS.quote,
      asOf: quote.updatedAt,
      warnings,
    }),
  );
}

export function writeHotCandles(
  request: CandleRequest,
  response: CandleResponse,
  source: string,
  warnings: string[] = [],
): void {
  void Promise.resolve(
    globalHotStore.write(hotCandlesKey(request), response, {
      source,
      freshMs: HOT_FRESH_MS.candles,
      staleMs: HOT_STALE_MS.candles,
      warnings,
    }),
  );
}

export function writeHotOptionExpirations(
  underlying: string,
  expirations: OptionExpiration[],
  source: string,
  warnings: string[] = [],
): void {
  void Promise.resolve(
    globalHotStore.write(hotOptionExpirationsKey(underlying), expirations, {
      source,
      freshMs: HOT_FRESH_MS.options_expirations,
      staleMs: HOT_STALE_MS.options_expirations,
      warnings,
    }),
  );
}

export function writeHotOptionsChain(
  request: OptionsChainRequest,
  chain: OptionsChainResponse,
  source: string,
  warnings: string[] = [],
): void {
  void Promise.resolve(
    globalHotStore.write(
      hotOptionsChainKey(
        request.underlying,
        request.expiration ?? "",
        request.strikeWindow,
      ),
      chain,
      {
        source,
        freshMs: HOT_FRESH_MS.options_chain,
        staleMs: HOT_STALE_MS.options_chain,
        warnings,
      },
    ),
  );
}
