import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createCandleStreamSession } from './createStreamSession';
import type { MarketDataService } from '../service/marketDataService';

describe('createCandleStreamSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits replace-latest after priming poll', async () => {
    const getCandles = vi
      .fn()
      .mockResolvedValueOnce({
        data: { symbol: 'AAPL', candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }] },
        source: 'ibkr',
        requestedAt: 1,
        receivedAt: 2,
        stale: false,
        warnings: [],
      })
      .mockResolvedValueOnce({
        data: { symbol: 'AAPL', candles: [{ t: 1000, o: 2, h: 3, l: 1, c: 2.5 }] },
        source: 'ibkr',
        requestedAt: 3,
        receivedAt: 4,
        stale: false,
        warnings: [],
      });

    const service = { getCandles } as unknown as MarketDataService;
    const events: string[] = [];
    const session = createCandleStreamSession(service, {
      symbol: 'AAPL',
      interval: '1d',
      range: '1mo',
    });

    session.start((payload) => events.push(payload));
    await Promise.resolve();
    expect(events).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(120_000);
    const parsed = events.map((payload) => JSON.parse(payload) as { type: string });
    expect(parsed.some((event) => event.type === 'replace-latest')).toBe(true);
    session.stop();
  });
});
