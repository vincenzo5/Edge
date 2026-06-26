import { describe, expect, it } from 'vitest';
import type { ChartDataFeed } from './dataSource';

describe('ChartDataFeed contract', () => {
  it('accepts a minimal feed implementation', async () => {
    const feed: ChartDataFeed = {
      async loadCandles(request) {
        return {
          symbol: request.symbol,
          interval: request.interval,
          candles: [],
          meta: { source: 'local', asOf: Date.now(), stale: false, warnings: [] },
        };
      },
    };

    const result = await feed.loadCandles({ symbol: 'TEST', interval: '1d', range: '1mo' });
    expect(result.meta.source).toBe('local');
  });
});
