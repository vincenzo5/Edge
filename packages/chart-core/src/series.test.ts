import { describe, expect, it, vi } from 'vitest';
import {
  applyCandleAppend,
  applyCandleReplaceLatest,
  applyCandleSnapshot,
  applyCandleStreamEvent,
  applyVisibleSlice,
  ensureCandlesCover,
  mergeCandlesByTimestamp,
  mergeCandlesPrepend,
  toHeikinAshi,
  transformCandlesForChartType,
} from './series';
import type { Candle } from './contracts';
import type { ChartDataMeta } from './dataSource';

const meta: ChartDataMeta = {
  source: 'yahoo',
  asOf: Date.now(),
  stale: false,
  warnings: [],
};

const base: Candle[] = [
  { t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 },
  { t: 2000, o: 1.5, h: 2.5, l: 1, c: 2 },
];

describe('mergeCandlesByTimestamp', () => {
  it('replaces duplicate timestamps and sorts ascending', () => {
    const merged = mergeCandlesByTimestamp(base, [{ t: 2000, o: 9, h: 9, l: 9, c: 9 }]);
    expect(merged).toHaveLength(2);
    expect(merged[1]?.c).toBe(9);
  });
});

describe('applyCandleSnapshot', () => {
  it('replaces the full series', () => {
    const next = applyCandleSnapshot(base, [{ t: 3000, o: 3, h: 4, l: 2, c: 3.5 }]);
    expect(next).toHaveLength(1);
    expect(next[0]?.t).toBe(3000);
  });
});

describe('applyCandleAppend', () => {
  it('appends a newer bar', () => {
    const next = applyCandleAppend(base, { t: 3000, o: 2, h: 3, l: 1.5, c: 2.5 });
    expect(next).toHaveLength(3);
    expect(next.at(-1)?.t).toBe(3000);
  });

  it('replaces the latest bar when timestamps match', () => {
    const next = applyCandleAppend(base, { t: 2000, o: 9, h: 9, l: 9, c: 9 });
    expect(next).toHaveLength(2);
    expect(next.at(-1)?.c).toBe(9);
  });

  it('merges out-of-order bars by timestamp', () => {
    const next = applyCandleAppend(base, { t: 1500, o: 5, h: 5, l: 5, c: 5 });
    expect(next.map((c) => c.t)).toEqual([1000, 1500, 2000]);
  });
});

describe('applyCandleReplaceLatest', () => {
  it('replaces the latest bar in place', () => {
    const next = applyCandleReplaceLatest(base, { t: 2000, o: 8, h: 8, l: 8, c: 8 });
    expect(next.at(-1)?.c).toBe(8);
  });

  it('appends when the incoming bar is newer', () => {
    const next = applyCandleReplaceLatest(base, { t: 3000, o: 3, h: 3, l: 3, c: 3 });
    expect(next.at(-1)?.t).toBe(3000);
  });
});

describe('applyCandleStreamEvent', () => {
  it('applies snapshot events', () => {
    const result = applyCandleStreamEvent(base, {
      type: 'snapshot',
      candles: [{ t: 5000, o: 1, h: 1, l: 1, c: 1 }],
      meta,
    });
    expect(result.candles).toHaveLength(1);
    expect(result.meta?.source).toBe('yahoo');
  });

  it('applies append events without dropping prepended history', () => {
    const prepended = mergeCandlesPrepend(base, [{ t: 500, o: 0.5, h: 0.5, l: 0.5, c: 0.5 }]);
    const result = applyCandleStreamEvent(prepended, {
      type: 'append',
      candle: { t: 3000, o: 3, h: 3, l: 3, c: 3 },
      meta,
    });
    expect(result.candles.map((c) => c.t)).toEqual([500, 1000, 2000, 3000]);
  });

  it('applies replace-latest events', () => {
    const result = applyCandleStreamEvent(base, {
      type: 'replace-latest',
      candle: { t: 2000, o: 7, h: 7, l: 7, c: 7 },
      meta,
    });
    expect(result.candles.at(-1)?.c).toBe(7);
  });
});

describe('toHeikinAshi', () => {
  it('transforms a simple series correctly', () => {
    const input: Candle[] = [
      { t: 1, o: 10, h: 12, l: 9, c: 11 },
      { t: 2, o: 11, h: 13, l: 10, c: 12 },
    ];
    const ha = toHeikinAshi(input);
    expect(ha).toHaveLength(2);
    expect(ha[0].o).toBeCloseTo(10.5);
    expect(ha[0].c).toBeCloseTo(10.5);
    expect(ha[1].o).toBeCloseTo(10.5);
    expect(ha[1].c).toBeCloseTo(11.5);
  });

  it('returns empty array for empty input', () => {
    expect(toHeikinAshi([])).toEqual([]);
  });
});

describe('transformCandlesForChartType', () => {
  const input: Candle[] = [
    { t: 1, o: 10, h: 12, l: 9, c: 11 },
    { t: 2, o: 11, h: 13, l: 10, c: 12 },
  ];

  it('returns candles unchanged for non-heikin types', () => {
    expect(transformCandlesForChartType(input, 'candle_solid')).toBe(input);
  });

  it('applies Heikin Ashi transform for heikin_ashi type', () => {
    const ha = transformCandlesForChartType(input, 'heikin_ashi');
    expect(ha).toHaveLength(2);
    expect(ha[0].o).toBeCloseTo(10.5);
    expect(ha[0].c).toBeCloseTo(10.5);
  });
});

describe('applyVisibleSlice', () => {
  const data: Candle[] = Array.from({ length: 10 }, (_, i) => ({
    t: i,
    o: i,
    h: i + 1,
    l: i - 1,
    c: i,
  }));

  it('returns full data when visibleCount is null or <=0', () => {
    expect(applyVisibleSlice(data, null)).toHaveLength(10);
    expect(applyVisibleSlice(data, 0)).toHaveLength(10);
  });

  it('slices from the start when visibleCount is positive', () => {
    expect(applyVisibleSlice(data, 3)).toHaveLength(3);
    expect(applyVisibleSlice(data, 3)[2].t).toBe(2);
  });
});

describe('ensureCandlesCover', () => {
  const DAY = 86_400_000;

  function makeCandles(count: number, startMs: number): Candle[] {
    return Array.from({ length: count }, (_, i) => ({
      t: startMs + i * DAY,
      o: 1,
      h: 1,
      l: 1,
      c: 1,
    }));
  }

  it('returns immediately when target is within loaded range', async () => {
    const candles = makeCandles(10, 1000);
    const result = await ensureCandlesCover(candles, candles[3]!.t, vi.fn());
    expect(result.covered).toBe(true);
    expect(result.prepended).toBe(0);
    expect(result.candles).toBe(candles);
  });

  it('prepends older bars until target is covered', async () => {
    const candles = makeCandles(5, 1000 + 5 * DAY);
    const older = makeCandles(3, 1000);
    const fetchOlder = vi.fn().mockResolvedValueOnce(older).mockResolvedValueOnce([]);

    const result = await ensureCandlesCover(candles, 1000 + DAY, fetchOlder);
    expect(result.covered).toBe(true);
    expect(result.prepended).toBe(3);
    expect(result.candles[0]!.t).toBe(1000);
    expect(fetchOlder).toHaveBeenCalledTimes(1);
  });
});
