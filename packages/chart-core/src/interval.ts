import type { Candle, Interval } from './contracts';

/** Provider interval strings (Yahoo-compatible subset). */
export type ProviderInterval = Interval;

export type FetchIntervalResolution = {
  providerInterval: ProviderInterval;
  resampleTo?: Interval;
};

/** Bar duration in milliseconds for domain intervals. */
export function intervalToMs(interval: Interval): number {
  switch (interval) {
    case '1m':
      return 60 * 1000;
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '2h':
      return 2 * 60 * 60 * 1000;
    case '1d':
      return 24 * 60 * 60 * 1000;
    case '1wk':
      return 7 * 24 * 60 * 60 * 1000;
    case '1mo':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/** Map domain interval to provider fetch params (Yahoo lacks native 2h). */
export function resolveFetchInterval(interval: Interval): FetchIntervalResolution {
  if (interval === '2h') {
    return { providerInterval: '1h', resampleTo: '2h' };
  }
  return { providerInterval: interval };
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/** Merge consecutive 1h bars into 2h OHLCV buckets aligned on even UTC hours. */
export function resampleCandlesTo2h(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];

  const buckets = new Map<number, Candle>();

  for (const c of candles) {
    const bucketStart = Math.floor(c.t / TWO_HOURS_MS) * TWO_HOURS_MS;
    const existing = buckets.get(bucketStart);
    if (!existing) {
      buckets.set(bucketStart, { ...c, t: bucketStart });
      continue;
    }
    existing.h = Math.max(existing.h, c.h);
    existing.l = Math.min(existing.l, c.l);
    existing.c = c.c;
    if (c.v != null) {
      existing.v = (existing.v ?? 0) + c.v;
    }
  }

  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

/** Apply post-fetch resampling when the provider could not serve the domain interval natively. */
export function applyIntervalResample(candles: Candle[], resampleTo?: Interval): Candle[] {
  if (resampleTo === '2h') return resampleCandlesTo2h(candles);
  return candles;
}
