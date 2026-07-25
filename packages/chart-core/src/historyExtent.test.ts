import { describe, expect, it } from 'vitest';
import { mergeChartHistoryExtent, visibleWindowMs } from './historyExtent';

describe('mergeChartHistoryExtent', () => {
  it('expands fromMs monotonically when older pages arrive', () => {
    const first = mergeChartHistoryExtent(
      null,
      { fromMs: 1_000, toMs: 5_000, completeness: 'discovered' },
      [{ t: 2_000 }, { t: 5_000 }],
      true,
    );
    const second = mergeChartHistoryExtent(
      first,
      { fromMs: 500, toMs: 4_000, completeness: 'discovered' },
      [{ t: 500 }, { t: 5_000 }],
      true,
    );
    expect(second?.fromMs).toBe(500);
    expect(second?.toMs).toBe(5_000);
    expect(second?.completeness).toBe('discovered');
  });

  it('marks exact when pagination is exhausted with exact provider bounds', () => {
    const merged = mergeChartHistoryExtent(
      { fromMs: 1_000, toMs: 5_000, completeness: 'exact' },
      { fromMs: 500, toMs: 5_000, completeness: 'exact' },
      [{ t: 500 }, { t: 5_000 }],
      false,
    );
    expect(merged?.completeness).toBe('exact');
  });
});

describe('visibleWindowMs', () => {
  const candles = [
    { t: 1_000 },
    { t: 2_000 },
    { t: 3_000 },
    { t: 4_000 },
    { t: 5_000 },
  ];

  it('maps fractional viewport indices to candle timestamps', () => {
    expect(visibleWindowMs(candles, 0.5, 2.5)).toEqual({ fromMs: 1_000, toMs: 3_000 });
  });
});
