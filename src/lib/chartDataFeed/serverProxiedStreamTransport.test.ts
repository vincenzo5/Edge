import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createServerProxiedCandleSubscription } from './serverProxiedStreamTransport';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('createServerProxiedCandleSubscription', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens SSE to candle stream endpoint and forwards events', () => {
    const events: Array<{ type: string }> = [];
    const unsubscribe = createServerProxiedCandleSubscription(
      { symbol: 'AAPL', interval: '1d', range: '1mo' },
      (event) => events.push(event),
    );

    const source = MockEventSource.instances[0]!;
    expect(source.url).toContain('/api/stream/candles?');
    expect(source.url).toContain('symbol=AAPL');

    source.emit(
      JSON.stringify({
        type: 'append',
        candle: { t: 1, o: 1, h: 1, l: 1, c: 1 },
        meta: { source: 'ibkr', asOf: 1000, stale: false, warnings: [] },
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('append');

    unsubscribe();
    expect(source.closed).toBe(true);
  });
});
