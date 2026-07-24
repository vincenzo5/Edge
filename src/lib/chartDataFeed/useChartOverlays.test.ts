import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChartOverlays } from './useChartOverlays';
import type { ChartDataFeed } from '@edge/chart-core';

describe('useChartOverlays', () => {
  it('loads events once and derives reference lines locally', async () => {
    const loadEvents = vi.fn(async () => ({
      events: [
        {
          id: 'earn-1',
          kind: 'earnings' as const,
          timestamp: 1000,
          title: 'Q1',
          symbol: 'AAPL',
          price: 180,
        },
      ],
      meta: { source: 'mixed' as const, asOf: 1000, stale: false, warnings: [] },
    }));
    const loadOverlays = vi.fn();

    const feed: ChartDataFeed = { loadCandles: vi.fn(), loadEvents, loadOverlays };

    const { result } = renderHook(() =>
      useChartOverlays({ feed, symbol: 'AAPL', deferMs: 0 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(loadEvents).toHaveBeenCalledTimes(1);
    expect(loadOverlays).not.toHaveBeenCalled();
    expect(result.current.events).toHaveLength(1);
    expect(result.current.referenceLines).toHaveLength(1);
    expect(result.current.referenceLines[0]?.price).toBe(180);
  });
});
