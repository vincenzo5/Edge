import type { IbkrOptionInfoRow, IbkrOptionStrikesResponse, IbkrSecdefSearchRow } from "./client";

type CacheEntry<T> = { value: T; expiresAt: number };

export type StockContractRecord = {
  symbol: string;
  conid: number;
  exchange?: string;
  currency?: string;
  companyName?: string;
  industry?: string;
  category?: string;
  subcategory?: string;
};

export type OptionMonthsRecord = {
  symbol: string;
  /** conid used for secdef/strikes/info (may differ from stock quote conid). */
  optionsConid: number;
  months: string[];
};

const TTL_MS = {
  stock: 24 * 60 * 60 * 1000,
  secdef: 60 * 60 * 1000,
  optMonths: 60 * 60 * 1000,
  strikes: 15 * 60 * 1000,
  optInfo: 15 * 60 * 1000,
} as const;

export function createContractCache() {
  const stores = new Map<string, CacheEntry<unknown>>();

  function read<T>(key: string): T | null {
    const entry = stores.get(key) as CacheEntry<T> | undefined;
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) stores.delete(key);
      return null;
    }
    return structuredClone(entry.value);
  }

  function write<T>(key: string, value: T, ttlMs: number): void {
    stores.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttlMs,
    });
  }

  return {
    clear(): void {
      stores.clear();
    },

    getStock(symbol: string): StockContractRecord | null {
      return read<StockContractRecord>(`stock:${symbol.trim().toUpperCase()}`);
    },

    setStock(record: StockContractRecord): void {
      write(`stock:${record.symbol}`, record, TTL_MS.stock);
    },

    getSecdef(symbol: string): IbkrSecdefSearchRow[] | null {
      return read<IbkrSecdefSearchRow[]>(`secdef:${symbol.trim().toUpperCase()}`);
    },

    setSecdef(symbol: string, rows: IbkrSecdefSearchRow[]): void {
      write(`secdef:${symbol.trim().toUpperCase()}`, rows, TTL_MS.secdef);
    },

    getOptionMonths(symbol: string): OptionMonthsRecord | null {
      return read<OptionMonthsRecord>(`optMonths:${symbol.trim().toUpperCase()}`);
    },

    setOptionMonths(record: OptionMonthsRecord): void {
      write(`optMonths:${record.symbol}`, record, TTL_MS.optMonths);
    },

    getStrikes(conid: number, month: string): IbkrOptionStrikesResponse | null {
      return read<IbkrOptionStrikesResponse>(`strikes:${conid}:${month}`);
    },

    setStrikes(conid: number, month: string, strikes: IbkrOptionStrikesResponse): void {
      write(`strikes:${conid}:${month}`, strikes, TTL_MS.strikes);
    },

    getOptionInfo(
      conid: number,
      month: string,
      strike: number,
      right: string,
    ): IbkrOptionInfoRow[] | null {
      return read<IbkrOptionInfoRow[]>(`optInfo:${conid}:${month}:${strike}:${right}`);
    },

    setOptionInfo(
      conid: number,
      month: string,
      strike: number,
      right: string,
      rows: IbkrOptionInfoRow[],
    ): void {
      write(`optInfo:${conid}:${month}:${strike}:${right}`, rows, TTL_MS.optInfo);
    },
  };
}

export type ContractCache = ReturnType<typeof createContractCache>;

/** Shared process-local cache for IBKR contract resolution. */
let sharedContractCache: ContractCache | undefined;

export function getSharedContractCache(): ContractCache {
  if (!sharedContractCache) {
    sharedContractCache = createContractCache();
  }
  return sharedContractCache;
}

export function clearSharedContractCacheForTests(): void {
  sharedContractCache?.clear();
  sharedContractCache = undefined;
}
