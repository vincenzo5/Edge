import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createApiChartDataFeed } from './apiChartDataFeed';

describe('createApiChartDataFeed', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('maps initial candle load with metadata', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5, v: 100 }],
        meta: { source: 'ibkr', stale: false, warnings: [], asOf: 1234 },
      }),
    });

    const feed = createApiChartDataFeed();
    const result = await feed.loadCandles({
      symbol: 'AAPL',
      interval: '1d',
      range: '1mo',
    });

    expect(result.candles).toHaveLength(1);
    expect(result.meta.source).toBe('ibkr');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/candles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          symbol: 'AAPL',
          range: '1mo',
          interval: '1d',
          sessionMode: 'regular',
        }),
      }),
    );
  });

  it('loads older history with before timestamp', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candles: [{ t: 1_700_000_000_000, o: 1, h: 2, l: 0.5, c: 1.5 }],
        meta: { source: 'yahoo', warnings: ['fallback'] },
      }),
    });

    const feed = createApiChartDataFeed();
    const result = await feed.loadMoreCandles!({
      symbol: 'AAPL',
      interval: '1d',
      beforeTimestamp: 1000,
    });

    expect(result.candles[0]?.t).toBe(1_700_000_000_000);
    expect(result.meta.warnings).toEqual(['fallback']);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body.before).toBe(1000);
    expect(body.barCount).toBe(500);
  });

  it('throws on non-OK candle responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'upstream failed' }),
    });

    const feed = createApiChartDataFeed();
    await expect(
      feed.loadCandles({ symbol: 'AAPL', interval: '1d', range: '1mo' }),
    ).rejects.toThrow('upstream failed');
  });

  it('requests macro events for benchmark symbols', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [
            {
              id: 'fmp-macro-cpi-US-2026-06-12',
              canonicalId: 'cpi',
              family: 'macro',
              title: 'CPI',
              scheduledAt: '2026-06-12T14:30:00.000Z',
              type: 'economic',
            },
          ],
          meta: { source: 'fmp', warnings: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ news: [], meta: { source: 'fmp', warnings: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expirations: [], meta: { source: 'ibkr', warnings: [] } }),
      });

    const feed = createApiChartDataFeed();
    const result = await feed.loadEvents!({ symbol: 'SPY' });

    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      'families=corporate%2Cfiling%2Cmacro',
    );
    expect(String(fetchMock.mock.calls[0]![0])).toContain('includeMacro=true');
    expect(result.events.some((event) => event.kind === 'macro')).toBe(true);
    expect(result.meta.source).toBe('mixed');
  });

  it('does not request macro events for single-name equity symbols', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [], meta: { source: 'edge-events', warnings: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ news: [], meta: { source: 'fmp', warnings: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expirations: [], meta: { source: 'ibkr', warnings: [] } }),
      });

    const feed = createApiChartDataFeed();
    await feed.loadEvents!({ symbol: 'AAPL' });

    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain('families=corporate%2Cfiling');
    expect(url).not.toContain('includeMacro=true');
  });

  it('merges news and options expiration overlay events', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [], meta: { source: 'edge-events', warnings: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          news: [
            {
              id: 'n1',
              headline: 'Apple beats',
              publishedAt: '2026-06-01T12:00:00.000Z',
            },
          ],
          meta: { source: 'fmp', warnings: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          expirations: ['2026-06-20'],
          meta: { source: 'ibkr', warnings: [] },
        }),
      });

    const feed = createApiChartDataFeed();
    const result = await feed.loadEvents!({ symbol: 'AAPL' });

    expect(result.events.some((event) => event.kind === 'news')).toBe(true);
    expect(result.events.some((event) => event.kind === 'options_expiration')).toBe(true);
  });

  it('parses date-only scheduledAt as noon UTC for daily candle alignment', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        events: [
          {
            id: 'split-1',
            type: 'split',
            title: 'Split',
            scheduledAt: '2026-06-01',
          },
        ],
        meta: { source: 'edge-events', warnings: [] },
      }),
    });

    const feed = createApiChartDataFeed();
    const result = await feed.loadEvents!({
      symbol: 'AAPL',
      kinds: ['split'],
    });

    expect(result.events[0]?.timestamp).toBe(Date.parse('2026-06-01T12:00:00.000Z'));
  });

  it('skips news and options expirations when kinds exclude them', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        events: [
          {
            id: 'earn-1',
            type: 'earnings',
            title: 'Q1',
            scheduledAt: '2026-06-01T12:00:00.000Z',
          },
        ],
        meta: { source: 'edge-events', warnings: [] },
      }),
    });

    const feed = createApiChartDataFeed();
    const result = await feed.loadEvents!({
      symbol: 'AAPL',
      kinds: ['earnings', 'dividend', 'split', 'filing'],
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.kind).toBe('earnings');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/api/events');
  });

  it('derives reference lines from priced events via loadOverlays', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [
            {
              id: 'earn-1',
              type: 'earnings',
              title: 'Q1',
              timestamp: 1000,
              price: 180,
            },
          ],
          meta: { source: 'edge-events', warnings: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ news: [], meta: { source: 'fmp', warnings: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expirations: [], meta: { source: 'ibkr', warnings: [] } }),
      });

    const feed = createApiChartDataFeed();
    const result = await feed.loadOverlays!({ symbol: 'AAPL', channel: 'referenceLines' });

    expect(result.referenceLines).toHaveLength(1);
    expect(result.referenceLines?.[0]?.price).toBe(180);
  });

  it('subscribes to candles via polling without an immediate snapshot', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
        meta: { source: 'ibkr', stale: false, warnings: [], asOf: 1000 },
      }),
    });

    const feed = createApiChartDataFeed();
    const events: Array<{ type: string }> = [];
    const unsubscribe = feed.subscribeCandles!(
      { symbol: 'AAPL', interval: '1d', range: '1mo' },
      (event) => events.push(event),
    );

    await Promise.resolve();
    expect(events).toHaveLength(0);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candles: [{ t: 1000, o: 2, h: 3, l: 1, c: 2.5 }],
        meta: { source: 'ibkr', stale: false, warnings: [], asOf: 2000 },
      }),
    });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(events.some((event) => event.type === 'replace-latest')).toBe(true);
    unsubscribe();
    vi.useRealTimers();
  });
});
