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

function makeCandles(count: number, startT = 1_000_000, stepMs = 86_400_000): Candle[] {
  return Array.from({ length: count }, (_, index) => ({
    t: startT + index * stepMs,
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

  it('resets the viewport when the interval session loads after panning', async () => {
    const dailyCandles = makeCandles(300);
    const weeklyCandles = makeCandles(120, dailyCandles[0]!.t, 7 * 86_400_000);
    const ref = createRef<EdgeChartHandle>();

    const { rerender } = render(
      <EdgeChart
        ref={ref}
        candles={dailyCandles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getVisibleRange()).not.toBeNull();
    });

    ref.current!.setVisibleRange(0, 80);
    await waitFor(() => {
      expect(ref.current?.isViewportModified()).toBe(true);
    });

    rerender(
      <EdgeChart
        ref={ref}
        candles={weeklyCandles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1wk"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.isViewportModified()).toBe(false);
    });
  });

  it('setCrosshairFromSync drives onCrosshairMove with clamped data index', async () => {
    const ref = createRef<EdgeChartHandle>();
    const onCrosshairMove = vi.fn();

    render(
      <EdgeChart
        ref={ref}
        candles={FIXTURE_CANDLES}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
        onCrosshairMove={onCrosshairMove}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getVisibleRange()).not.toBeNull();
    });

    ref.current!.setCrosshairFromSync(FIXTURE_CANDLES[1]!.t);

    await waitFor(() => {
      expect(onCrosshairMove).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: FIXTURE_CANDLES[1]!.t,
          dataIndex: expect.any(Number),
          plotX: expect.any(Number),
        }),
      );
    });
  });

  it('shifts viewport indices when older history prepends', async () => {
    const candles = makeCandles(120);
    const olderStart = candles[0]!.t - 50 * 86_400_000;
    const older = makeCandles(50, olderStart);

    const baselineRef = createRef<EdgeChartHandle>();
    render(
      <EdgeChart
        ref={baselineRef}
        candles={candles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(baselineRef.current?.getVisibleRange()).not.toBeNull();
    });
    const baselineVp = baselineRef.current!.getVisibleRange()!;

    const ref = createRef<EdgeChartHandle>();
    const onLoadOlderCandles = vi.fn().mockResolvedValue(older);

    render(
      <EdgeChart
        ref={ref}
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
      expect(ref.current?.getRawCandleCount()).toBe(170);
    });

    const afterPrependVp = ref.current!.getVisibleRange()!;
    expect(afterPrependVp.startIndex).toBe(baselineVp.startIndex + 50);
    expect(afterPrependVp.endIndex).toBe(baselineVp.endIndex + 50);
  });

  it('wheel pan updates viewport when a sub-pane is visible', async () => {
    const candles = makeCandles(120);
    const ref = createRef<EdgeChartHandle>();
    const state = createDefaultChartState({
      indicators: [
        {
          id: 'rsi-1',
          name: 'RSI',
          pane: 'sub',
          inputs: { period: 14 },
          visible: true,
        },
      ],
    });

    const { container } = render(
      <EdgeChart
        ref={ref}
        candles={candles}
        state={state}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getVisibleRange()).not.toBeNull();
    });

    expect(container.querySelectorAll('canvas').length).toBeGreaterThan(1);

    const before = ref.current!.getVisibleRange()!;
    const chartArea = container.querySelector('[data-edge-chart]');
    expect(chartArea).not.toBeNull();
    fireEvent.wheel(chartArea!, { deltaX: 3000, deltaY: 0, deltaMode: 0 });

    await waitFor(() => {
      const after = ref.current!.getVisibleRange()!;
      expect(after.startIndex).not.toBe(before.startIndex);
      expect(after.endIndex).not.toBe(before.endIndex);
    });
  });

  it('resets sub-pane viewports when the interval session loads', async () => {
    const dailyCandles = makeCandles(300);
    const weeklyCandles = makeCandles(120, dailyCandles[0]!.t, 7 * 86_400_000);
    const ref = createRef<EdgeChartHandle>();
    const state = createDefaultChartState({
      indicators: [
        {
          id: 'rsi-1',
          name: 'RSI',
          pane: 'rsi',
          inputs: { period: 14 },
          visible: true,
        },
      ],
    });

    const { rerender } = render(
      <EdgeChart
        ref={ref}
        candles={dailyCandles}
        state={state}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1d"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getVisibleRange()).not.toBeNull();
    });

    ref.current!.setVisibleRange(0, 80);
    await waitFor(() => {
      expect(ref.current?.isViewportModified()).toBe(true);
    });

    rerender(
      <EdgeChart
        ref={ref}
        candles={weeklyCandles}
        state={state}
        theme="dark"
        symbol="DEMO"
        range="1y"
        interval="1wk"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.isViewportModified()).toBe(false);
    });
  });
});
