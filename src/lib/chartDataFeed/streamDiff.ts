import type { Candle, ChartCandleStreamEvent, ChartDataMeta } from '@edge/chart-core';

export function candleChanged(a: Candle, b: Candle): boolean {
  return a.o !== b.o || a.h !== b.h || a.l !== b.l || a.c !== b.c || a.v !== b.v;
}

/**
 * Diff two candle pages into chart stream events.
 * Used by client polling and server-proxied SSE sessions.
 */
export function diffCandlesToStreamEvents(
  previous: Candle[],
  next: Candle[],
  meta: ChartDataMeta,
): ChartCandleStreamEvent[] {
  if (next.length === 0) return [];

  const prevLast = previous[previous.length - 1];
  const nextLast = next[next.length - 1]!;

  if (!prevLast) {
    return [{ type: 'snapshot', candles: next, meta }];
  }

  if (nextLast.t === prevLast.t) {
    if (candleChanged(prevLast, nextLast)) {
      return [{ type: 'replace-latest', candle: nextLast, meta }];
    }
    return [];
  }

  if (nextLast.t > prevLast.t) {
    const newBars = next.filter((bar) => bar.t > prevLast.t);
    return newBars.map((candle) => ({ type: 'append', candle, meta }));
  }

  return [{ type: 'snapshot', candles: next, meta }];
}
