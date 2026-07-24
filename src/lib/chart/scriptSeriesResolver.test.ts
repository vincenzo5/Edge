import { describe, expect, it, vi } from 'vitest';
import type { Candle, ChartDataFeed } from '@edge/chart-core';
import { createChartScriptSeriesResolver } from './scriptSeriesResolver';

const primary: Candle[] = [{ t: 1, o: 1, h: 1, l: 1, c: 1, v: 1 }];

describe('createChartScriptSeriesResolver', () => {
  it('loads each unique secondary key through the feed', async () => {
    const loadCandles = vi.fn(async ({ symbol, interval }: { symbol: string; interval: string }) => ({
      candles: [{ ...primary[0]!, t: symbol === 'SPY' ? 2 : 3 }],
      meta: undefined,
    }));
    const feed = { loadCandles } as unknown as ChartDataFeed;
    const resolver = createChartScriptSeriesResolver(feed);

    const fetched = await resolver(
      [{ symbol: 'SPY', interval: '1d' }, { symbol: 'SPY', interval: '1d' }],
      {
        symbol: 'AAPL',
        interval: '1h',
        range: '1y',
        sessionMode: 'regular',
      },
    );

    expect(loadCandles).toHaveBeenCalledTimes(1);
    expect(fetched.get('SPY|1d')?.[0]?.t).toBe(2);
  });
});
