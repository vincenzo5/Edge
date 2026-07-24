import {
  HOT_STORE_MAX_ENTRIES,
  HOT_STORE_SOFT_BYTE_BUDGET,
} from "./cacheBudgets";
import type { HotStoreBackend } from "./cacheBackendTypes";
import { evictMapUntilWithinBudget } from "./cacheEviction";
import { approxPayloadBytes, prepareServerSnapshot } from "./immutableSnapshot";
import type { HotReadResult } from "./cacheBackendTypes";

export type HotStoreEntry<T> = {
  data: T;
  source: string;
  asOf: number;
  freshUntil: number;
  staleUntil: number;
  warnings: string[];
  touchedAt: number;
  approxBytes: number;
};

export type HotStoreOptions = {
  maxEntries?: number;
  softByteBudget?: number;
};

export class HotStore implements HotStoreBackend {
  private entries = new Map<string, HotStoreEntry<unknown>>();

  constructor(private readonly options: HotStoreOptions = {}) {}

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
    entry.touchedAt = now;
    const fresh = now < entry.freshUntil;
    return {
      hit: true,
      data: entry.data,
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
    const stored = prepareServerSnapshot(data);
    this.entries.set(key, {
      data: stored,
      source: options.source,
      asOf,
      freshUntil: now + options.freshMs,
      staleUntil: now + options.staleMs,
      warnings: options.warnings ?? [],
      touchedAt: now,
      approxBytes: approxPayloadBytes(stored),
    });
    this.evictIfNeeded();
  }

  clear(): void {
    this.entries.clear();
  }

  invalidate(keys: string[]): void {
    for (const key of keys) {
      this.entries.delete(key);
    }
  }

  invalidateDisplayDataCaches(): void {
    for (const key of [...this.entries.keys()]) {
      if (
        key.startsWith("hot|quote|") ||
        key.startsWith("hot|candles|") ||
        key.startsWith("hot|options-exp|") ||
        key.startsWith("hot|options-chain|")
      ) {
        this.entries.delete(key);
      }
    }
  }

  size(): number {
    return this.entries.size;
  }

  approxTotalBytes(): number {
    let sum = 0;
    for (const entry of this.entries.values()) {
      sum += entry.approxBytes;
    }
    return sum;
  }

  private evictIfNeeded(): void {
    evictMapUntilWithinBudget(this.entries, {
      maxEntries: this.options.maxEntries ?? HOT_STORE_MAX_ENTRIES,
      softBytes: this.options.softByteBudget ?? HOT_STORE_SOFT_BYTE_BUDGET,
    });
  }
}
