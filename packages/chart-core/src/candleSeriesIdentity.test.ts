import { describe, expect, it, beforeEach } from 'vitest';
import type { Candle } from './contracts';
import {
  advanceCandleSeriesIdentity,
  createCandleSeriesIdentity,
  resetCandleSeriesIdentitySeqForTests,
} from './candleSeriesIdentity';
import { applyCandleReplaceLatest } from './series';

const candles: Candle[] = [
  { t: 1000, o: 10, h: 10, l: 10, c: 10 },
  { t: 2000, o: 20, h: 20, l: 20, c: 20 },
  { t: 3000, o: 30, h: 30, l: 30, c: 30 },
];

describe('candleSeriesIdentity', () => {
  beforeEach(() => {
    resetCandleSeriesIdentitySeqForTests();
  });

  it('bumps body revision on append and snapshot', () => {
    const initial = createCandleSeriesIdentity(candles);
    const appended = advanceCandleSeriesIdentity(initial, [...candles, { t: 4000, o: 40, h: 40, l: 40, c: 40 }], 'append');
    expect(appended.bodyRevision).toBeGreaterThan(initial.bodyRevision);
    expect(appended.length).toBe(4);
  });

  it('preserves body revision on replace-latest with same length', () => {
    const initial = createCandleSeriesIdentity(candles);
    const replaced = applyCandleReplaceLatest(candles, {
      ...candles[2]!,
      c: 31,
    });
    const next = advanceCandleSeriesIdentity(initial, replaced, 'replace-latest');
    expect(next.bodyRevision).toBe(initial.bodyRevision);
    expect(next.tipRevision).not.toBe(initial.tipRevision);
  });

  it('bumps body revision on append that increases length', () => {
    const initial = createCandleSeriesIdentity(candles.slice(0, 2));
    const appended = [...candles.slice(0, 2), candles[2]!];
    const next = advanceCandleSeriesIdentity(initial, appended, 'append');
    expect(next.bodyRevision).toBeGreaterThan(initial.bodyRevision);
    expect(next.length).toBe(3);
  });
});
