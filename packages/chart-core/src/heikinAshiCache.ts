import type { Candle } from './contracts';
import type { CandleSeriesIdentity } from './candleSeriesIdentity';
import { candleValueFingerprint } from './indicatorCompute';

export const HEIKIN_ASHI_CACHE_MAX_ENTRIES = 8;

const cache = new Map<string, readonly Candle[]>();
const order: string[] = [];

function freezeCandleSeries(candles: Candle[]): readonly Candle[] {
  if (candles.length === 0) {
    return Object.freeze(candles);
  }
  for (const candle of candles) {
    if (!Object.isFrozen(candle)) {
      Object.freeze(candle);
    }
  }
  return Object.freeze(candles);
}

function cacheKey(candles: Candle[], identity?: CandleSeriesIdentity): string {
  if (identity) {
    return `${identity.length}|${identity.bodyRevision}|${identity.tipRevision}`;
  }
  return `${candles.length}|${candleValueFingerprint(candles)}`;
}

function touchKey(key: string): void {
  const index = order.indexOf(key);
  if (index >= 0) {
    order.splice(index, 1);
  }
  order.push(key);
}

function evictIfNeeded(): void {
  while (order.length > HEIKIN_ASHI_CACHE_MAX_ENTRIES) {
    const oldest = order.shift();
    if (oldest) {
      cache.delete(oldest);
    }
  }
}

export function clearHeikinAshiCache(): void {
  cache.clear();
  order.length = 0;
}

export function getCachedHeikinAshi(
  candles: Candle[],
  identity?: CandleSeriesIdentity,
): readonly Candle[] | null {
  const key = cacheKey(candles, identity);
  const hit = cache.get(key);
  if (!hit) {
    return null;
  }
  touchKey(key);
  return hit;
}

export function setCachedHeikinAshi(
  candles: Candle[],
  ha: Candle[],
  identity?: CandleSeriesIdentity,
): readonly Candle[] {
  const key = cacheKey(candles, identity);
  const frozen = freezeCandleSeries(ha);
  cache.set(key, frozen);
  touchKey(key);
  evictIfNeeded();
  return frozen;
}
