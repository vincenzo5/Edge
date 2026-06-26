import type { Candle } from './contracts';
import type { ChartCandleStreamEvent, ChartDataMeta } from './dataSource';

export type ChartType =
  | 'candle_solid'
  | 'candle_stroke'
  | 'ohlc'
  | 'area'
  | 'heikin_ashi';

/** Heikin Ashi transform (pure). */
export function toHeikinAshi(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const out: Candle[] = [];
  let prevHA: Candle | null = null;
  for (const c of candles) {
    const haOpen = prevHA ? (prevHA.o + prevHA.c) / 2 : (c.o + c.c) / 2;
    const haClose = (c.o + c.h + c.l + c.c) / 4;
    const haHigh = Math.max(c.h, haOpen, haClose);
    const haLow = Math.min(c.l, haOpen, haClose);
    const ha: Candle = { t: c.t, o: haOpen, h: haHigh, l: haLow, c: haClose, v: c.v };
    out.push(ha);
    prevHA = ha;
  }
  return out;
}

/** Apply visible slice (e.g. Bar Replay). */
export function applyVisibleSlice(candles: Candle[], visibleCount: number | null): Candle[] {
  if (visibleCount == null || visibleCount <= 0) return candles;
  return candles.slice(0, visibleCount);
}

export function transformCandlesForChartType(candles: Candle[], chartType: ChartType): Candle[] {
  if (chartType === 'heikin_ashi') return toHeikinAshi(candles);
  return candles;
}

/** Merge candles by timestamp; later entries win on duplicate timestamps. */
export function mergeCandlesByTimestamp(existing: Candle[], incoming: Candle[]): Candle[] {
  if (incoming.length === 0) return existing;
  const byTimestamp = new Map(existing.map((c) => [c.t, c]));
  for (const candle of incoming) {
    byTimestamp.set(candle.t, candle);
  }
  return [...byTimestamp.values()].sort((a, b) => a.t - b.t);
}

/** Merge older candles before existing series; dedupe by timestamp, sort ascending. */
export function mergeCandlesPrepend(existing: Candle[], older: Candle[]): Candle[] {
  if (older.length === 0) return existing;
  const seen = new Set(existing.map((c) => c.t));
  const merged = [...older.filter((c) => !seen.has(c.t)), ...existing];
  merged.sort((a, b) => a.t - b.t);
  return merged;
}

/** Replace the full candle series with a sorted snapshot. */
export function applyCandleSnapshot(_existing: Candle[], candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  return mergeCandlesByTimestamp([], candles);
}

/** Append a newer bar or replace the latest bar when timestamps match. */
export function applyCandleAppend(existing: Candle[], candle: Candle): Candle[] {
  if (existing.length === 0) return [candle];
  const last = existing[existing.length - 1]!;
  if (candle.t > last.t) {
    return [...existing, candle];
  }
  if (candle.t === last.t) {
    return [...existing.slice(0, -1), candle];
  }
  return mergeCandlesByTimestamp(existing, [candle]);
}

/** Replace the latest bar, append when newer, or patch an existing timestamp. */
export function applyCandleReplaceLatest(existing: Candle[], candle: Candle): Candle[] {
  if (existing.length === 0) return [candle];
  const last = existing[existing.length - 1]!;
  if (candle.t === last.t) {
    return [...existing.slice(0, -1), candle];
  }
  if (candle.t > last.t) {
    return [...existing, candle];
  }
  const index = existing.findIndex((entry) => entry.t === candle.t);
  if (index >= 0) {
    const next = [...existing];
    next[index] = candle;
    return next;
  }
  return mergeCandlesByTimestamp(existing, [candle]);
}

export type ApplyCandleStreamResult = {
  candles: Candle[];
  meta?: ChartDataMeta;
};

/** Apply a live candle stream event to the current series. */
export function applyCandleStreamEvent(
  existing: Candle[],
  event: ChartCandleStreamEvent,
): ApplyCandleStreamResult {
  switch (event.type) {
    case 'snapshot':
      return { candles: applyCandleSnapshot(existing, event.candles), meta: event.meta };
    case 'append':
      return { candles: applyCandleAppend(existing, event.candle), meta: event.meta };
    case 'replace-latest':
      return { candles: applyCandleReplaceLatest(existing, event.candle), meta: event.meta };
    case 'stale':
    case 'reconnect':
    case 'error':
      return { candles: existing, meta: event.meta };
  }
}

export const EDGE_FETCH_BAR_COUNT = 200;
export const PREFETCH_START_INDEX_THRESHOLD = 30;

export function shouldPrefetchEdge(startIndex: number, threshold = PREFETCH_START_INDEX_THRESHOLD): boolean {
  return startIndex < threshold;
}

export type EnsureCandlesCoverResult = {
  candles: Candle[];
  prepended: number;
  covered: boolean;
};

/** Prepend older bars until `targetMs` is at or after the first loaded bar (or history ends). */
export async function ensureCandlesCover(
  candles: Candle[],
  targetMs: number,
  fetchOlder: (beforeTimestampMs: number) => Promise<Candle[]>,
  maxRounds = 20,
  minLeadingBars = 0,
): Promise<EnsureCandlesCoverResult> {
  let current = candles;
  if (current.length === 0) {
    return { candles: current, prepended: 0, covered: false };
  }
  const hasEnoughLoadedLead = () => {
    if (targetMs < current[0]!.t) return false;
    if (minLeadingBars <= 0) return true;
    const targetIndex = current.findIndex((c) => c.t >= targetMs);
    return targetIndex < 0 || targetIndex >= minLeadingBars;
  };
  if (hasEnoughLoadedLead()) {
    return { candles: current, prepended: 0, covered: true };
  }

  let prepended = 0;
  for (let round = 0; round < maxRounds; round++) {
    if (hasEnoughLoadedLead()) {
      return { candles: current, prepended, covered: true };
    }
    const older = await fetchOlder(current[0]!.t);
    if (older.length === 0) {
      return { candles: current, prepended, covered: targetMs >= current[0]!.t };
    }
    const beforeLen = current.length;
    current = mergeCandlesPrepend(current, older);
    prepended += current.length - beforeLen;
    if (current.length === beforeLen) {
      return { candles: current, prepended, covered: targetMs >= current[0]!.t };
    }
  }

  return {
    candles: current,
    prepended,
    covered: targetMs >= current[0]!.t,
  };
}
