import { describe, it, expect, vi } from 'vitest';
import type { Candle } from './contracts';
import { ensureCandlesCover, mergeCandlesPrepend } from './series';

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

describe('ensureCandlesCover', () => {
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

  it('continues prepending until target has requested leading history', async () => {
    const candles = makeCandles(5, 1000 + 5 * DAY);
    const older1 = makeCandles(3, 1000 + 2 * DAY);
    const older2 = makeCandles(2, 1000);
    const fetchOlder = vi.fn().mockResolvedValueOnce(older1).mockResolvedValueOnce(older2);

    const result = await ensureCandlesCover(candles, 1000 + 5 * DAY, fetchOlder, 20, 4);
    expect(result.covered).toBe(true);
    expect(result.candles[0]!.t).toBe(1000);
    expect(fetchOlder).toHaveBeenCalledTimes(2);
  });

  it('allows covered navigation when no more leading history exists', async () => {
    const candles = makeCandles(5, 1000);
    const fetchOlder = vi.fn().mockResolvedValue([]);

    const result = await ensureCandlesCover(candles, 1000 + DAY, fetchOlder, 20, 10);
    expect(result.covered).toBe(true);
    expect(fetchOlder).toHaveBeenCalledTimes(1);
  });

  it('returns covered false when fetch returns no data', async () => {
    const candles = makeCandles(5, 1000 + 5 * DAY);
    const fetchOlder = vi.fn().mockResolvedValue([]);
    const result = await ensureCandlesCover(candles, 1000, fetchOlder);
    expect(result.covered).toBe(false);
  });

  it('mergeCandlesPrepend dedupes overlapping timestamps', () => {
    const existing = makeCandles(3, 1000);
    const older: Candle[] = [
      { t: 1000 - DAY, o: 1, h: 1, l: 1, c: 1 },
      { t: 1000, o: 1, h: 1, l: 1, c: 1 },
    ];
    const merged = mergeCandlesPrepend(existing, older);
    expect(merged.length).toBe(4);
    expect(merged[0]!.t).toBe(1000 - DAY);
  });
});
