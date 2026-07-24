import type { CandleResponse, EquityCandle } from "../contracts/equities";

const APPROX_CANDLE_BYTES = 48;
const MAX_RECURSE_DEPTH = 4;

function isFrozen(value: unknown): boolean {
  return value !== null && typeof value === "object" && Object.isFrozen(value);
}

function isCandleLike(value: unknown): value is EquityCandle {
  return (
    value !== null &&
    typeof value === "object" &&
    "t" in value &&
    "o" in value &&
    "h" in value &&
    "l" in value &&
    "c" in value
  );
}

/** Freeze OHLCV arrays for shared cache storage (server-side mirror of chartClientCache). */
export function freezeCandleSeries<T extends EquityCandle>(candles: T[]): readonly T[] {
  if (candles.length === 0) {
    return Object.freeze(candles);
  }
  if (isFrozen(candles)) {
    return candles;
  }
  for (const candle of candles) {
    if (!isFrozen(candle)) {
      Object.freeze(candle);
    }
  }
  return Object.freeze(candles);
}

function freezeCandleResponse(response: CandleResponse): CandleResponse {
  return {
    ...response,
    candles: [...freezeCandleSeries(response.candles)],
  };
}

type UniverseLikePayload = {
  byDate: Record<string, Record<string, EquityCandle>>;
  tradingDates: string[];
  asOf: number;
};

function freezeUniverseDailyPayload(payload: UniverseLikePayload): UniverseLikePayload {
  const byDate: Record<string, Record<string, EquityCandle>> = {};
  for (const [date, map] of Object.entries(payload.byDate)) {
    const frozenDay: Record<string, EquityCandle> = {};
    for (const [symbol, candle] of Object.entries(map)) {
      frozenDay[symbol] = isFrozen(candle) ? candle : Object.freeze({ ...candle });
    }
    byDate[date] = Object.freeze(frozenDay);
  }
  return Object.freeze({
    byDate: Object.freeze(byDate),
    tradingDates: Object.freeze([...payload.tradingDates]),
    asOf: payload.asOf,
  }) as UniverseLikePayload;
}

/**
 * Prepare a value for cache storage: freeze large candle/universe payloads;
 * structuredClone small mutable records.
 */
export function prepareServerSnapshot<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && isCandleLike(value[0])) {
      return freezeCandleSeries(value as EquityCandle[]) as T;
    }
    return structuredClone(value);
  }
  if ("candles" in value && Array.isArray((value as unknown as CandleResponse).candles)) {
    return freezeCandleResponse(value as unknown as CandleResponse) as T;
  }
  if ("byDate" in value && "tradingDates" in value && "asOf" in value) {
    return freezeUniverseDailyPayload(value as unknown as UniverseLikePayload) as T;
  }
  return structuredClone(value);
}

/** Approximate retained bytes for LRU byte-budget eviction. */
export function approxPayloadBytes(value: unknown, depth = 0): number {
  if (value == null) return 8;
  if (typeof value === "number" || typeof value === "boolean") return 8;
  if (typeof value === "string") return value.length * 2;
  if (Array.isArray(value)) {
    if (value.length > 0 && isCandleLike(value[0])) {
      return value.length * APPROX_CANDLE_BYTES;
    }
    if (depth >= MAX_RECURSE_DEPTH) return value.length * 64;
    return value.reduce((sum, item) => sum + approxPayloadBytes(item, depth + 1), 0);
  }
  if (typeof value === "object") {
    if ("candles" in value && Array.isArray((value as unknown as CandleResponse).candles)) {
      return approxPayloadBytes((value as unknown as CandleResponse).candles, depth + 1) + 256;
    }
    if ("byDate" in value && "tradingDates" in value) {
      const store = value as UniverseLikePayload;
      let sum = store.tradingDates.length * 16;
      for (const map of Object.values(store.byDate)) {
        sum += Object.keys(map).length * APPROX_CANDLE_BYTES;
      }
      return sum;
    }
    if (depth >= MAX_RECURSE_DEPTH) return 512;
    let sum = 256;
    for (const nested of Object.values(value as Record<string, unknown>)) {
      sum += approxPayloadBytes(nested, depth + 1);
    }
    return sum;
  }
  return 64;
}
