import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import ChartCanvas from './canvas';
import type { ChartPaneHandle } from './paneHandle';
import type { Candle, SerializedDrawing } from '@edge/chart-core/contracts';
import { PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@edge/chart-core/layout';
import { layoutEventBadgeGroups } from './eventBadges';

const candles: Candle[] = Array.from({ length: 200 }, (_, i) => ({
  t: i,
  o: 10 + i * 0.1,
  h: 12 + i * 0.1,
  l: 9 + i * 0.1,
  c: 11 + i * 0.1,
}));

function renderChartCanvas(
  width = 800,
  height = 400,
  extraProps: Partial<React.ComponentProps<typeof ChartCanvas>> = {},
) {
  const onViewportChange = vi.fn();
  const handleRef = { current: null as ChartPaneHandle | null };
  const registerPane = (handle: ChartPaneHandle) => {
    handleRef.current = handle;
    return () => {
      handleRef.current = null;
    };
  };

  const view = render(
    <ChartCanvas
      candles={candles}
      chartType="candle_solid"
      theme="dark"
      width={width}
      height={height}
      registerPane={registerPane}
      onViewportChange={onViewportChange}
      {...extraProps}
    />,
  );

  return {
    ...view,
    getHandle: () => {
      if (!handleRef.current) throw new Error('pane handle not registered');
      return handleRef.current;
    },
    onViewportChange,
    registerPane,
  };
}

describe('ChartCanvas pane handle', () => {
  it('emits viewport after wheel action', () => {
    const { getHandle, onViewportChange } = renderChartCanvas();
    onViewportChange.mockClear();

    const vp = getHandle().applyWheelAction({ type: 'pan', deltaX: 40 }, 400);

    expect(vp).not.toBeNull();
    expect(onViewportChange).toHaveBeenCalledTimes(1);
    expect(onViewportChange).toHaveBeenCalledWith(vp, 'price');
  });

  it('resetViewport uses current canvas dimensions after resize', () => {
    const { getHandle, rerender, registerPane, onViewportChange } =
      renderChartCanvas(800, 400);
    getHandle().applyWheelAction({ type: 'pan', deltaX: 100 }, 400);

    rerender(
      <ChartCanvas
        candles={candles}
        chartType="candle_solid"
        theme="dark"
        width={640}
        height={320}
        registerPane={registerPane}
        onViewportChange={onViewportChange}
      />,
    );

    const reset = getHandle().resetViewport();
    expect(reset?.width).toBe(640);
    expect(reset?.height).toBe(320);
  });

  it('syncTimeWindow ignores updates while dragging unless forced', () => {
    const { getHandle, container } = renderChartCanvas();
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const before = getHandle().getViewport()!;
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 200 });

    getHandle().syncTimeWindow(0, 50);
    expect(getHandle().getViewport()!.startIndex).toBe(before.startIndex);
    expect(getHandle().getViewport()!.endIndex).toBe(before.endIndex);

    getHandle().syncTimeWindow(0, 50, true);
    expect(getHandle().getViewport()!.startIndex).toBe(0);
    expect(getHandle().getViewport()!.endIndex).toBe(50);

    fireEvent.mouseUp(canvas);
  });
});

describe('ChartCanvas context menu', () => {
  function renderWithContextMenu(
    onDrawingContextMenu: (event: unknown) => boolean | void,
    onContainerContextMenu = vi.fn(),
  ) {
    return render(
      <div onContextMenu={onContainerContextMenu}>
        <ChartCanvas
          candles={candles}
          chartType="candle_solid"
          theme="dark"
          width={800}
          height={400}
          paneId="price"
          onDrawingContextMenu={onDrawingContextMenu}
        />
      </div>,
    );
  }

  it('stops propagation when drawing context menu handler returns true', () => {
    const onDrawingContextMenu = vi.fn(() => true);
    const onContainerContextMenu = vi.fn();
    const { container } = renderWithContextMenu(onDrawingContextMenu, onContainerContextMenu);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    fireEvent.contextMenu(canvas, { clientX: 100, clientY: 200 });

    expect(onDrawingContextMenu).toHaveBeenCalledTimes(1);
    expect(onContainerContextMenu).not.toHaveBeenCalled();
  });

  it('allows propagation when drawing context menu handler returns false', () => {
    const onDrawingContextMenu = vi.fn(() => false);
    const onContainerContextMenu = vi.fn();
    const { container } = renderWithContextMenu(onDrawingContextMenu, onContainerContextMenu);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    fireEvent.contextMenu(canvas, { clientX: 100, clientY: 200 });

    expect(onDrawingContextMenu).toHaveBeenCalledTimes(1);
    expect(onContainerContextMenu).toHaveBeenCalledTimes(1);
  });
});

describe('ChartCanvas axis drag', () => {
  function priceAxisClientX(width: number) {
    return width - PRICE_AXIS_WIDTH / 2;
  }

  function plotBodyClientX(width: number) {
    return (width - PRICE_AXIS_WIDTH) / 2;
  }

  it('transitions from price-axis scale drag to body pan when cursor enters plot', () => {
    const width = 800;
    const height = 400;
    const { container, getHandle } = renderChartCanvas(width, height);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const axisX = priceAxisClientX(width);
    const bodyX = plotBodyClientX(width);
    const y = height / 2;

    fireEvent.mouseDown(canvas, { clientX: axisX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: axisX, clientY: y + 40 });

    const afterScale = getHandle().getViewport()!;
    expect(afterScale.priceScaleMode).toBe('manual');
    const rangeAfterScale = afterScale.priceMax - afterScale.priceMin;
    const startAfterScale = afterScale.startIndex;

    fireEvent.mouseMove(canvas, { clientX: bodyX, clientY: y + 40 });
    fireEvent.mouseMove(canvas, { clientX: bodyX - 60, clientY: y + 40 });

    const afterPan = getHandle().getViewport()!;
    expect(afterPan.startIndex).not.toBe(startAfterScale);
    expect(afterPan.priceMax - afterPan.priceMin).toBeCloseTo(rangeAfterScale, 4);

    fireEvent.mouseUp(canvas);
  });

  it('continues scaling price on the price axis when scale is already manual', () => {
    const width = 800;
    const height = 400;
    const { container, getHandle } = renderChartCanvas(width, height);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const axisX = priceAxisClientX(width);
    const y = height / 2;

    fireEvent.mouseDown(canvas, { clientX: axisX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: axisX, clientY: y + 30 });
    fireEvent.mouseUp(canvas);

    const manual = getHandle().getViewport()!;
    expect(manual.priceScaleMode).toBe('manual');
    const rangeBefore = manual.priceMax - manual.priceMin;
    const midBefore = (manual.priceMin + manual.priceMax) / 2;

    fireEvent.mouseDown(canvas, { clientX: axisX, clientY: y + 30 });
    fireEvent.mouseMove(canvas, { clientX: axisX, clientY: y + 70 });
    fireEvent.mouseUp(canvas);

    const rescaled = getHandle().getViewport()!;
    expect(rescaled.priceMax - rescaled.priceMin).not.toBeCloseTo(rangeBefore, 4);
    const midAfter = (rescaled.priceMin + rescaled.priceMax) / 2;
    expect(midAfter).toBeCloseTo(midBefore, 4);
  });

  it('scales time when dragging from the time axis strip', () => {
    const width = 800;
    const height = 400;
    const { container, getHandle } = renderChartCanvas(width, height);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const timeAxisY = height - TIME_AXIS_HEIGHT / 2;
    const bodyX = plotBodyClientX(width);
    const before = getHandle().getViewport()!;
    const visibleBefore = before.endIndex - before.startIndex;

    fireEvent.mouseDown(canvas, { clientX: bodyX, clientY: timeAxisY });
    fireEvent.mouseMove(canvas, { clientX: bodyX + 60, clientY: timeAxisY });
    fireEvent.mouseUp(canvas);

    const after = getHandle().getViewport()!;
    expect(after.endIndex - after.startIndex).toBeLessThan(visibleBefore);
    expect(after.priceScaleMode).toBe('manual');
  });

  it('allows axis scale gestures after a scale drag converted to body pan', () => {
    const width = 800;
    const height = 400;
    const { container, getHandle } = renderChartCanvas(width, height);
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const axisX = priceAxisClientX(width);
    const bodyX = plotBodyClientX(width);
    const timeAxisY = height - TIME_AXIS_HEIGHT / 2;
    const y = height / 2;

    fireEvent.mouseDown(canvas, { clientX: axisX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: axisX, clientY: y + 40 });
    fireEvent.mouseMove(canvas, { clientX: bodyX, clientY: y + 40 });
    fireEvent.mouseMove(canvas, { clientX: bodyX - 60, clientY: y + 40 });
    fireEvent.mouseUp(canvas);

    const afterPan = getHandle().getViewport()!;
    const priceRangeAfterPan = afterPan.priceMax - afterPan.priceMin;
    const visibleAfterPan = afterPan.endIndex - afterPan.startIndex;

    fireEvent.mouseDown(canvas, { clientX: axisX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: axisX, clientY: y + 35 });
    fireEvent.mouseUp(canvas);

    const afterPriceScale = getHandle().getViewport()!;
    expect(afterPriceScale.priceMax - afterPriceScale.priceMin).not.toBeCloseTo(
      priceRangeAfterPan,
      4
    );

    fireEvent.mouseDown(canvas, { clientX: bodyX, clientY: timeAxisY });
    fireEvent.mouseMove(canvas, { clientX: bodyX + 60, clientY: timeAxisY });
    fireEvent.mouseUp(canvas);

    const afterTimeScale = getHandle().getViewport()!;
    expect(afterTimeScale.endIndex - afterTimeScale.startIndex).toBeLessThan(visibleAfterPan);
  });
});

describe('ChartCanvas candle replace vs prepend', () => {
  const MS_DAY = 86_400_000;

  function makeDailyCandles(count: number, endT: number, priceBase = 10): Candle[] {
    const startT = endT - (count - 1) * MS_DAY;
    return Array.from({ length: count }, (_, i) => ({
      t: startT + i * MS_DAY,
      o: priceBase + i * 0.1,
      h: priceBase + 2 + i * 0.1,
      l: priceBase - 1 + i * 0.1,
      c: priceBase + 1 + i * 0.1,
    }));
  }

  it('rebuilds session viewport when cache→fresh grows length without shifting indices', () => {
    const endT = Date.UTC(2026, 6, 17);
    const cached = makeDailyCandles(200, endT, 50);
    const fresh = makeDailyCandles(500, endT, 10);
    // Same last timestamp as cache (fresh includes cache tail + older history).
    expect(fresh.at(-1)?.t).toBe(cached.at(-1)?.t);

    const { getHandle, rerender, registerPane, onViewportChange } = renderChartCanvas(
      800,
      400,
      {
        candles: cached,
        viewportRevision: 'QQQ|1y|1d',
        interval: '1d',
      },
    );

    const afterCache = getHandle().getViewport()!;
    expect(afterCache.endIndex).toBeGreaterThanOrEqual(cached.length - 0.5);

    rerender(
      <ChartCanvas
        candles={fresh}
        chartType="candle_solid"
        theme="dark"
        width={800}
        height={400}
        registerPane={registerPane}
        onViewportChange={onViewportChange}
        viewportRevision="QQQ|1y|1d"
        interval="1d"
      />,
    );

    const afterFresh = getHandle().getViewport()!;
    // Must stay on the live edge of the longer series — not keep cached indices.
    expect(afterFresh.endIndex).toBeGreaterThanOrEqual(fresh.length - 0.5);
    expect(afterFresh.startIndex).toBeGreaterThan(cached.length);
  });

  it('keeps shifted prepend indices when already at the new live edge', () => {
    const endT = Date.UTC(2026, 6, 17);
    const original = makeDailyCandles(200, endT, 50);
    const older = makeDailyCandles(100, original[0]!.t - MS_DAY, 10);
    const prepended = [...older, ...original];
    const added = 100;

    const { getHandle, rerender, registerPane, onViewportChange } = renderChartCanvas(
      800,
      400,
      {
        candles: original,
        viewportRevision: 'QQQ|1y|1d',
        interval: '1d',
      },
    );

    const before = getHandle().getViewport()!;
    // Simulate EdgeChart adjustViewportForPrepend before candles prop updates.
    getHandle().syncTimeWindow(before.startIndex + added, before.endIndex + added, true);

    rerender(
      <ChartCanvas
        candles={prepended}
        chartType="candle_solid"
        theme="dark"
        width={800}
        height={400}
        registerPane={registerPane}
        onViewportChange={onViewportChange}
        viewportRevision="QQQ|1y|1d"
        interval="1d"
      />,
    );

    const after = getHandle().getViewport()!;
    expect(after.startIndex).toBeCloseTo(before.startIndex + added, 5);
    expect(after.endIndex).toBeCloseTo(before.endIndex + added, 5);
  });
});

describe('ChartCanvas crosshair during pan', () => {
  function plotBodyClientX(width: number) {
    return (width - PRICE_AXIS_WIDTH) / 2;
  }

  it('keeps crosshair anchored to the clicked chart position while panning', () => {
    const width = 800;
    const height = 400;
    const onCrosshairMove = vi.fn();
    const { container, getHandle } = renderChartCanvas(width, height, { onCrosshairMove });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const bodyX = plotBodyClientX(width);
    const y = height / 2;

    fireEvent.mouseMove(canvas, { clientX: bodyX, clientY: y });
    const hoverEvent = onCrosshairMove.mock.calls.at(-1)?.[0];
    expect(hoverEvent).toBeDefined();

    onCrosshairMove.mockClear();
    fireEvent.mouseDown(canvas, { clientX: bodyX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: bodyX - 80, clientY: y });

    const panEvent = onCrosshairMove.mock.calls.at(-1)?.[0];
    expect(panEvent).toBeDefined();
    expect(panEvent.dataIndex).toBe(hoverEvent.dataIndex);
    expect(panEvent.plotX).not.toBe(hoverEvent.plotX);

    const vp = getHandle().getViewport()!;
    expect(panEvent.plotX).toBeCloseTo(vp.xForIndex(hoverEvent.dataIndex), 1);
    expect(panEvent.localY).toBe(panEvent.plotY);

    fireEvent.mouseUp(canvas);
  });

  it('keeps horizontal crosshair at the anchored price while panning', () => {
    const width = 800;
    const height = 400;
    const onCrosshairMove = vi.fn();
    const { container, getHandle } = renderChartCanvas(width, height, { onCrosshairMove });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const bodyX = plotBodyClientX(width);
    const y = height / 2;

    fireEvent.mouseMove(canvas, { clientX: bodyX, clientY: y });
    const hoverEvent = onCrosshairMove.mock.calls.at(-1)?.[0];
    expect(hoverEvent).toBeDefined();

    const vpBefore = getHandle().getViewport()!;
    const anchoredPrice = vpBefore.priceForY(hoverEvent.plotY);

    onCrosshairMove.mockClear();
    fireEvent.mouseDown(canvas, { clientX: bodyX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: bodyX - 80, clientY: y + 25 });

    const panEvent = onCrosshairMove.mock.calls.at(-1)?.[0];
    expect(panEvent).toBeDefined();
    expect(panEvent.localY).toBe(panEvent.plotY);

    const vpAfter = getHandle().getViewport()!;
    expect(vpAfter.priceForY(panEvent.plotY)).toBeCloseTo(anchoredPrice, 4);
    expect(panEvent.plotY).toBeCloseTo(vpAfter.yForPrice(anchoredPrice), 1);

    fireEvent.mouseUp(canvas);
  });
});

describe('ChartCanvas cursor policy', () => {
  function plotBodyClientX(width: number) {
    return (width - PRICE_AXIS_WIDTH) / 2;
  }

  it('shows crosshair on plot body when a drawing tool is armed', () => {
    const width = 800;
    const height = 400;
    const { container } = renderChartCanvas(width, height, { activeTool: 'trend_line' });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    fireEvent.mouseMove(canvas, { clientX: plotBodyClientX(width), clientY: height / 2 });
    expect(canvas.style.cursor).toBe('crosshair');
  });

  it('shows grab cursor when hovering a visible drawing in navigate mode', () => {
    const width = 800;
    const height = 400;
    const drawing: SerializedDrawing = {
      id: 'd1',
      name: 'trend_line',
      label: 'TL',
      points: [
        { dataIndex: 50, value: 15 },
        { dataIndex: 150, value: 25 },
      ],
      visible: true,
      locked: false,
      zLevel: 1,
    };
    const { container, getHandle } = renderChartCanvas(width, height, {
      drawings: [drawing],
      activeTool: '__cursor__',
    });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const vp = getHandle().getViewport()!;
    const clientX = vp.xForIndex(100);
    const clientY = vp.yForPrice(20);

    fireEvent.mouseMove(canvas, { clientX, clientY });
    expect(canvas.style.cursor).toBe('grab');
  });
});

describe('ChartCanvas drawing pointer vs pan', () => {
  function plotBodyClientX(width: number) {
    return (width - PRICE_AXIS_WIDTH) / 2;
  }

  it('consumes plot-body pointer down in navigate mode and suppresses viewport pan', () => {
    const width = 800;
    const height = 400;
    const onDrawingPointer = vi.fn((event: { phase: string }) => event.phase === 'down');
    const onUserTimePan = vi.fn();
    const { container, getHandle } = renderChartCanvas(width, height, {
      drawingMode: 'navigate',
      onDrawingPointer,
      onUserTimePan,
    });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const bodyX = plotBodyClientX(width);
    const y = height / 2;
    const startIndex = getHandle().getViewport()!.startIndex;

    fireEvent.mouseDown(canvas, { clientX: bodyX, clientY: y });
    fireEvent.mouseMove(canvas, { clientX: bodyX - 80, clientY: y });

    expect(onDrawingPointer).toHaveBeenCalled();
    expect(getHandle().getViewport()!.startIndex).toBe(startIndex);
    expect(onUserTimePan).not.toHaveBeenCalled();

    fireEvent.mouseUp(canvas);
  });
});

describe('ChartCanvas event badge interaction', () => {
  const MS_DAY = 86_400_000;
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    const ctx = new Proxy(
      { canvas: { width: 800, height: 400 } },
      {
        get(target, prop) {
          if (prop === 'canvas') return target.canvas;
          if (prop === 'measureText') return () => ({ width: 0 });
          if (prop === 'createLinearGradient') return () => ({ addColorStop: vi.fn() });
          return vi.fn();
        },
      },
    );
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type) => {
      if (type === '2d') return ctx as unknown as CanvasRenderingContext2D;
      return null;
    });
  });

  afterEach(() => {
    getContextSpy?.mockRestore();
    getContextSpy = null;
  });

  function makeDailyCandles(count: number): Candle[] {
    const endT = Date.UTC(2026, 6, 17);
    const startT = endT - (count - 1) * MS_DAY;
    return Array.from({ length: count }, (_, i) => ({
      t: startT + i * MS_DAY,
      o: 10 + i * 0.1,
      h: 12 + i * 0.1,
      l: 9 + i * 0.1,
      c: 11 + i * 0.1,
    }));
  }

  function plotBodyClientX(width: number) {
    return (width - PRICE_AXIS_WIDTH) / 2;
  }

  function badgeClientPos(
    getHandle: () => ChartPaneHandle,
    dailyCandles: Candle[],
    eventMarkers: Array<{ id: string; kind: 'earnings'; timestamp: number; title: string; symbol: string }>,
  ) {
    const vp = getHandle().getViewport()!;
    const groups = layoutEventBadgeGroups(eventMarkers, vp, dailyCandles, 'dark', true, true);
    const badge = groups[0];
    if (!badge) throw new Error('expected badge layout');
    return { clientX: badge.x, clientY: badge.y, badge };
  }

  it('routes badge click to onEventBadgeClick in navigate mode', async () => {
    const width = 800;
    const height = 400;
    const dailyCandles = makeDailyCandles(200);
    const marker = {
      id: 'e1',
      kind: 'earnings' as const,
      timestamp: dailyCandles[150]!.t,
      title: 'Earnings',
      symbol: 'TEST',
    };
    const onEventBadgeClick = vi.fn();
    const onEventBadgeHover = vi.fn();
    const { container, getHandle } = renderChartCanvas(width, height, {
      candles: dailyCandles,
      eventMarkers: [marker],
      onEventBadgeClick,
      onEventBadgeHover,
    });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const { clientX, clientY, badge } = badgeClientPos(getHandle, dailyCandles, [marker]);
    fireEvent.mouseMove(canvas, { clientX, clientY });
    await waitFor(() => {
      expect(onEventBadgeHover).toHaveBeenCalled();
    });
    onEventBadgeClick.mockClear();
    fireEvent.mouseDown(canvas, { clientX, clientY });

    expect(onEventBadgeClick).toHaveBeenCalledTimes(1);
    expect(onEventBadgeClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: badge.id }),
      expect.objectContaining({ clientX, clientY }),
    );
  });

  it('emits hover callbacks and pointer cursor over event badges', async () => {
    const width = 800;
    const height = 400;
    const dailyCandles = makeDailyCandles(200);
    const marker = {
      id: 'e1',
      kind: 'earnings' as const,
      timestamp: dailyCandles[150]!.t,
      title: 'Earnings',
      symbol: 'TEST',
    };
    const onEventBadgeHover = vi.fn();
    const { container, getHandle } = renderChartCanvas(width, height, {
      candles: dailyCandles,
      eventMarkers: [marker],
      onEventBadgeHover,
    });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    const { clientX, clientY, badge } = badgeClientPos(getHandle, dailyCandles, [marker]);
    fireEvent.mouseMove(canvas, { clientX, clientY });

    await waitFor(() => {
      expect(onEventBadgeHover).toHaveBeenCalled();
    });
    expect(onEventBadgeHover.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ id: badge.id }),
    );
    expect(canvas.style.cursor).toBe('pointer');

    fireEvent.mouseLeave(canvas, { relatedTarget: document.body });
    expect(onEventBadgeHover).toHaveBeenCalledWith(null);
  });

  it('does not treat plot-body clicks as badge clicks away from badge bounds', () => {
    const width = 800;
    const height = 400;
    const dailyCandles = makeDailyCandles(200);
    const marker = {
      id: 'e1',
      kind: 'earnings' as const,
      timestamp: dailyCandles[150]!.t,
      title: 'Earnings',
      symbol: 'TEST',
    };
    const onEventBadgeClick = vi.fn();
    const { container } = renderChartCanvas(width, height, {
      candles: dailyCandles,
      eventMarkers: [marker],
      onEventBadgeClick,
    });
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('canvas not found');

    fireEvent.mouseDown(canvas, { clientX: plotBodyClientX(width), clientY: height / 2 });
    expect(onEventBadgeClick).not.toHaveBeenCalled();
  });
});
