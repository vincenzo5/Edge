import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  candlePollIntervalMs,
  createPollingCandleSubscription,
  createPollingQuoteSubscription,
  MAX_POLL_FAILURES_BEFORE_STALE,
} from './pollStreamAdapter';
import type { ChartCandleStreamEvent, ChartQuoteStreamEvent } from '@edge/chart-core';

describe('pollStreamAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives interval-aware poll cadence', () => {
    expect(candlePollIntervalMs('1m')).toBe(15_000);
    expect(candlePollIntervalMs('1d')).toBe(120_000);
  });

  it('primes candle polling without emitting an initial snapshot', async () => {
    const events: ChartCandleStreamEvent[] = [];
    const loadLatest = vi.fn().mockResolvedValue({
      candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
      meta: { source: 'yahoo', asOf: 1000, stale: false, warnings: [] },
    });

    const unsubscribe = createPollingCandleSubscription(loadLatest, 1000, (event) => {
      events.push(event);
    });

    await Promise.resolve();
    expect(events).toHaveLength(0);

    loadLatest.mockResolvedValueOnce({
      candles: [{ t: 1000, o: 2, h: 3, l: 1, c: 2.5 }],
      meta: { source: 'yahoo', asOf: 2000, stale: false, warnings: [] },
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(events.some((event) => event.type === 'replace-latest')).toBe(true);

    unsubscribe();
  });

  it('emits append events for new bars', async () => {
    const events: ChartCandleStreamEvent[] = [];
    const loadLatest = vi
      .fn()
      .mockResolvedValueOnce({
        candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
        meta: { source: 'yahoo', asOf: 1000, stale: false, warnings: [] },
      })
      .mockResolvedValueOnce({
        candles: [
          { t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 },
          { t: 2000, o: 2, h: 3, l: 1, c: 2.5 },
        ],
        meta: { source: 'yahoo', asOf: 2000, stale: false, warnings: [] },
      });

    const unsubscribe = createPollingCandleSubscription(loadLatest, 1000, (event) => {
      events.push(event);
    });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(events.some((event) => event.type === 'append')).toBe(true);
    unsubscribe();
  });

  it('marks candle polling stale after repeated failures', async () => {
    const events: ChartCandleStreamEvent[] = [];
    const loadLatest = vi
      .fn()
      .mockResolvedValueOnce({
        candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
        meta: { source: 'yahoo', asOf: 1000, stale: false, warnings: [] },
      })
      .mockRejectedValue(new Error('network down'));

    const unsubscribe = createPollingCandleSubscription(loadLatest, 1000, (event) => {
      events.push(event);
    });

    await Promise.resolve();
    for (let attempt = 0; attempt < MAX_POLL_FAILURES_BEFORE_STALE; attempt += 1) {
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(events.some((event) => event.type === 'stale')).toBe(true);
    unsubscribe();
  });

  it('emits quote snapshot then updates', async () => {
    const events: ChartQuoteStreamEvent[] = [];
    const loadLatest = vi
      .fn()
      .mockResolvedValueOnce({
        quotes: [{ symbol: 'AAPL', price: 100, change: 1, changePercent: 1, volume: 10, updatedAt: 1 }],
        meta: { source: 'ibkr', asOf: 1, stale: false, warnings: [] },
      })
      .mockResolvedValueOnce({
        quotes: [{ symbol: 'AAPL', price: 101, change: 2, changePercent: 2, volume: 11, updatedAt: 2 }],
        meta: { source: 'ibkr', asOf: 2, stale: false, warnings: [] },
      });

    const unsubscribe = createPollingQuoteSubscription(loadLatest, 1000, (event) => {
      events.push(event);
    });

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(events[0]?.type).toBe('snapshot');
    expect(events.some((event) => event.type === 'update')).toBe(true);
    unsubscribe();
  });
});
