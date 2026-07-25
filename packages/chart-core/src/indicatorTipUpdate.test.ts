import { describe, expect, it, beforeEach } from 'vitest';
import type { Candle } from './contracts';
import {
  clearComputeCache,
  computeTipStableCacheKey,
  getComputedSeries,
} from './indicatorCompute';
import {
  advanceCandleSeriesIdentity,
  createCandleSeriesIdentity,
  resetCandleSeriesIdentitySeqForTests,
} from './candleSeriesIdentity';
import { assertTipParity } from './indicatorTipUpdate';
import { applyCandleReplaceLatest } from './series';
import { emaPlugin } from './indicators/ema';
import { ma } from './indicators/ma';
import { rsi } from './indicators/rsi';
import { atr } from './indicators/atr';
import { macd } from './indicators/macd';
import { vwap } from './indicators/vwap';

function makeSeries(count: number, start = 1000): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    t: start + i * 60_000,
    o: 100 + i,
    h: 101 + i,
    l: 99 + i,
    c: 100.5 + i,
    v: 1000 + i * 10,
  }));
}

describe('indicator tip incremental compute', () => {
  beforeEach(() => {
    clearComputeCache();
    resetCandleSeriesIdentitySeqForTests();
  });

  const plugins = [
    { plugin: emaPlugin, inputs: { period: 20 } },
    { plugin: ma, inputs: { period: 20 } },
    { plugin: rsi, inputs: { period: 14 } },
    { plugin: atr, inputs: { period: 14 } },
    { plugin: macd, inputs: { fast: 12, slow: 26, signal: 9 } },
    { plugin: vwap, inputs: {} },
  ] as const;

  it.each(plugins)('replace-latest tip parity for $plugin.name', ({ plugin, inputs }) => {
    const candles = makeSeries(120);
    let identity = createCandleSeriesIdentity(candles);
    getComputedSeries(plugin, candles, inputs, undefined, { identity });

    const next = applyCandleReplaceLatest(candles, {
      ...candles[candles.length - 1]!,
      c: candles[candles.length - 1]!.c + 1.25,
      h: candles[candles.length - 1]!.h + 1.5,
    });
    identity = advanceCandleSeriesIdentity(identity, next, 'replace-latest');
    const incremental = getComputedSeries(plugin, next, inputs, undefined, { identity });
    expect(incremental).not.toBeNull();
    expect(assertTipParity(plugin.name, next, inputs, incremental!)).toBe(true);
  });

  it('revision cache key uses bodyRevision instead of body fingerprint', () => {
    const candles = makeSeries(5000);
    const identity = createCandleSeriesIdentity(candles);
    const key = computeTipStableCacheKey('EMA', { period: 20 }, candles, identity);
    expect(key.endsWith(`|${identity.bodyRevision}`)).toBe(true);
  });

  it('append tip parity for EMA', () => {
    const candles = makeSeries(120);
    let identity = createCandleSeriesIdentity(candles);
    getComputedSeries(emaPlugin, candles, { period: 20 }, undefined, { identity });

    const next = [...candles, { t: candles[candles.length - 1]!.t + 60_000, o: 220, h: 221, l: 219, c: 220.5, v: 5000 }];
    identity = advanceCandleSeriesIdentity(identity, next, 'append');
    const incremental = getComputedSeries(emaPlugin, next, { period: 20 }, undefined, { identity });
    expect(incremental).not.toBeNull();
    expect(assertTipParity('EMA', next, { period: 20 }, incremental!)).toBe(true);
  });
});
