import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { createDefaultChartState, restoreChartState, serializeChartState } from '@edge/chart-core';
import type { Candle } from '@edge/chart-core';
import EdgeChart, { type EdgeChartHandle } from './EdgeChart';

const FIXTURE_CANDLES = [
  { t: 1000, o: 100, h: 110, l: 90, c: 105, v: 1000 },
  { t: 2000, o: 105, h: 115, l: 95, c: 110, v: 1100 },
  { t: 3000, o: 110, h: 120, l: 100, c: 115, v: 1200 },
];

function makeCandles(count: number, startT = 1_000_000): Candle[] {
  return Array.from({ length: count }, (_, index) => ({
    t: startT + index * 86_400_000,
    o: 100,
    h: 110,
    l: 90,
    c: 105,
    v: 1000,
  }));
}

describe('@edge/chart-react EdgeChart', () => {
  it('renders with fixture candles and exposes getState/setState', async () => {
    const ref = createRef<EdgeChartHandle>();
    const initialState = createDefaultChartState({ chartType: 'candle_solid' });

    render(
      <EdgeChart
        ref={ref}
        candles={FIXTURE_CANDLES}
        state={initialState}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getRawCandleCount()).toBe(FIXTURE_CANDLES.length);
    });

    const liveState = ref.current!.getState();
    expect(liveState.version).toBe(1);
    expect(liveState.chartType).toBe('candle_solid');

    const nextState = serializeChartState({
      ...liveState,
      chartType: 'area',
    });
    ref.current!.setState(restoreChartState(nextState));

    await waitFor(() => {
      expect(ref.current?.getState().chartType).toBe('area');
    });
  });

  it('getVisibleRange returns a viewport after candles mount', async () => {
    const ref = createRef<EdgeChartHandle>();
    render(
      <EdgeChart
        ref={ref}
        candles={FIXTURE_CANDLES}
        state={createDefaultChartState()}
        theme="dark"
        loading={false}
      />,
    );
    await waitFor(() => {
      expect(ref.current?.getVisibleRange()).not.toBeNull();
    });
  });

  it('updates candles when the symbol changes but timestamps match', async () => {
    const ref = createRef<EdgeChartHandle>();
    const nextCandles = FIXTURE_CANDLES.map((candle) => ({
      ...candle,
      o: candle.o + 100,
      h: candle.h + 100,
      l: candle.l + 100,
      c: candle.c + 100,
    }));

    const { rerender } = render(
      <EdgeChart
        ref={ref}
        candles={FIXTURE_CANDLES}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getCandles().at(-1)?.c).toBe(115);
    });

    rerender(
      <EdgeChart
        ref={ref}
        candles={nextCandles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="ALT"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getCandles().at(-1)?.c).toBe(215);
    });
  });

  it('updates indicator legend values when the symbol changes but timestamps match', async () => {
    const nextCandles = FIXTURE_CANDLES.map((candle) => ({
      ...candle,
      o: candle.o + 100,
      h: candle.h + 100,
      l: candle.l + 100,
      c: candle.c + 100,
    }));
    const state = createDefaultChartState({
      indicators: [
        {
          id: 'ma-1',
          name: 'MA',
          pane: 'main',
          inputs: { period: 2 },
          visible: true,
        },
      ],
      chartSettings: {
        statusLine: {
          indicatorShowValues: true,
        },
      },
    });

    const { rerender } = render(
      <EdgeChart
        candles={FIXTURE_CANDLES}
        state={state}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('MA 112.5')).toBeInTheDocument();
    });

    rerender(
      <EdgeChart
        candles={nextCandles}
        state={state}
        theme="dark"
        symbol="ALT"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('MA 212.5')).toBeInTheDocument();
    });
  });

  it('hides the price legend when the main series is hidden', () => {
    render(
      <EdgeChart
        candles={FIXTURE_CANDLES}
        state={createDefaultChartState({ mainSeriesVisible: false })}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
  });

  it('prefetches older history in the background after candles mount', async () => {
    const candles = makeCandles(300);
    const older = makeCandles(50, 100_000);
    const onLoadOlderCandles = vi.fn().mockResolvedValue(older);

    render(
      <EdgeChart
        candles={candles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
        onLoadOlderCandles={onLoadOlderCandles}
      />,
    );

    await waitFor(() => {
      expect(onLoadOlderCandles).toHaveBeenCalledTimes(1);
    });
    expect(onLoadOlderCandles).toHaveBeenCalledWith(candles[0]!.t);
  });

  it('fetches additional history after panning toward the left edge', async () => {
    const candles = makeCandles(120);
    const older = makeCandles(50, 100_000);
    const onLoadOlderCandles = vi
      .fn()
      .mockResolvedValueOnce(older)
      .mockResolvedValue(older);

    const { container } = render(
      <EdgeChart
        candles={candles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
        onLoadOlderCandles={onLoadOlderCandles}
      />,
    );

    await waitFor(() => {
      expect(onLoadOlderCandles).toHaveBeenCalledTimes(1);
    });

    onLoadOlderCandles.mockClear();

    const chartArea = container.querySelector('[data-edge-chart]');
    expect(chartArea).not.toBeNull();
    fireEvent.wheel(chartArea!, { deltaX: 4000, deltaY: 0, deltaMode: 0 });

    await waitFor(
      () => {
        expect(onLoadOlderCandles).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });
});
