import { describe, expect, it } from 'vitest';
import {
  applyCandleAppend,
  applyCandleReplaceLatest,
  applyCandleSnapshot,
  applyCandleStreamEvent,
  mergeCandlesByTimestamp,
  mergeCandlesPrepend,
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
