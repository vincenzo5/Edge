import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { createApiChartDataFeed } from './apiChartDataFeed';
import { createServerProxiedStreamTransport } from './serverProxiedStreamTransport';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {}

  emit(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('createApiChartDataFeed server-proxied transport', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('uses server-proxied SSE when configured', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candles: [{ t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 }],
        meta: { source: 'ibkr', stale: false, warnings: [], asOf: 1000 },
      }),
    });

    const feed = createApiChartDataFeed({
      streamTransport: createServerProxiedStreamTransport,
    });

    const events: Array<{ type: string }> = [];
    const unsubscribe = feed.subscribeCandles!(
      { symbol: 'AAPL', interval: '1d', range: '1mo' },
      (event) => events.push(event),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(MockEventSource.instances[0]?.url).toContain('/api/stream/candles');

    MockEventSource.instances[0]?.emit(
      JSON.stringify({
        type: 'replace-latest',
        candle: { t: 1000, o: 2, h: 3, l: 1, c: 2.5 },
        meta: { source: 'ibkr', asOf: 2000, stale: false, warnings: [] },
      }),
    );

    await waitFor(() =>
      expect(events.some((event) => event.type === 'replace-latest')).toBe(true),
    );
    unsubscribe();
  });
});
