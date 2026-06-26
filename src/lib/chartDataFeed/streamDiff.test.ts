import { describe, expect, it } from 'vitest';
import { diffCandlesToStreamEvents } from './streamDiff';

const meta = { source: 'ibkr' as const, asOf: 1000, stale: false, warnings: [] };

describe('diffCandlesToStreamEvents', () => {
  it('returns snapshot when previous is empty', () => {
    const next = [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }];
    const events = diffCandlesToStreamEvents([], next, meta);
    expect(events).toEqual([{ type: 'snapshot', candles: next, meta }]);
  });

  it('returns replace-latest when same timestamp changes OHLC', () => {
    const prev = [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }];
    const next = [{ t: 1000, o: 2, h: 3, l: 1, c: 2.5 }];
    const events = diffCandlesToStreamEvents(prev, next, meta);
    expect(events).toEqual([{ type: 'replace-latest', candle: next[0], meta }]);
  });

  it('returns append for new bars', () => {
    const prev = [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }];
    const next = [
      { t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 },
      { t: 2000, o: 2, h: 3, l: 1, c: 2.5 },
    ];
    const events = diffCandlesToStreamEvents(prev, next, meta);
    expect(events).toEqual([{ type: 'append', candle: next[1], meta }]);
  });
});
