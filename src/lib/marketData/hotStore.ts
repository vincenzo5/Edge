import type { CandleRequest, CandleResponse, EquityQuote } from "./contracts/equities";
import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "./contracts/options";
import { buildCacheKey } from "./cache";

export type HotStoreEntry<T> = {
  data: T;
  source: string;
  asOf: number;
  freshUntil: number;
  staleUntil: number;
  warnings: string[];
};

export type HotReadResult<T> = {
  hit: boolean;
  data: T | null;
  fresh: boolean;
  servable: boolean;
  asOf?: number;
  source?: string;
  warnings?: string[];
};

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

export class HotStore {
  private entries = new Map<string, HotStoreEntry<unknown>>();

  read<T>(key: string): HotReadResult<T> {
    const entry = this.entries.get(key) as HotStoreEntry<T> | undefined;
    if (!entry) {
      return { hit: false, data: null, fresh: false, servable: false };
    }
    const now = Date.now();
    if (now >= entry.staleUntil) {
      this.entries.delete(key);
      return { hit: false, data: null, fresh: false, servable: false };
    }
    const fresh = now < entry.freshUntil;
    return {
      hit: true,
      data: structuredClone(entry.data),
      fresh,
      servable: true,
      asOf: entry.asOf,
      source: entry.source,
      warnings: [...entry.warnings],
    };
  }

  write<T>(
    key: string,
    data: T,
    options: {
      source: string;
      freshMs: number;
      staleMs: number;
      asOf?: number;
      warnings?: string[];
    },
  ): void {
    const now = Date.now();
    const asOf = options.asOf ?? now;
    this.entries.set(key, {
      data: structuredClone(data),
      source: options.source,
      asOf,
      freshUntil: now + options.freshMs,
      staleUntil: now + options.staleMs,
      warnings: options.warnings ?? [],
    });
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Process-local hot store for UI-critical market data reads. */
export const globalHotStore = new HotStore();

export function clearHotStoreForTests(): void {
  globalHotStore.clear();
}

export function writeHotQuote(
  quote: EquityQuote,
  source: string,
  warnings: string[] = [],
): void {
  globalHotStore.write(hotQuoteKey(quote.symbol), quote, {
    source,
    freshMs: HOT_FRESH_MS.quote,
    staleMs: HOT_STALE_MS.quote,
    asOf: quote.updatedAt,
    warnings,
  });
}

export function writeHotCandles(
  request: CandleRequest,
  response: CandleResponse,
  source: string,
  warnings: string[] = [],
): void {
  globalHotStore.write(hotCandlesKey(request), response, {
    source,
    freshMs: HOT_FRESH_MS.candles,
    staleMs: HOT_STALE_MS.candles,
    warnings,
  });
}

export function writeHotOptionExpirations(
  underlying: string,
  expirations: OptionExpiration[],
  source: string,
  warnings: string[] = [],
): void {
  globalHotStore.write(hotOptionExpirationsKey(underlying), expirations, {
    source,
    freshMs: HOT_FRESH_MS.options_expirations,
    staleMs: HOT_STALE_MS.options_expirations,
    warnings,
  });
}

export function writeHotOptionsChain(
  request: OptionsChainRequest,
  chain: OptionsChainResponse,
  source: string,
  warnings: string[] = [],
): void {
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
  );
}
