import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ChartCanvas from './canvas';
import type { ChartPaneHandle } from './paneHandle';
import type { Candle } from '@edge/chart-core/contracts';
import { PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@edge/chart-core/layout';

const candles: Candle[] = Array.from({ length: 200 }, (_, i) => ({
  t: i,
  o: 10 + i * 0.1,
  h: 12 + i * 0.1,
  l: 9 + i * 0.1,
  c: 11 + i * 0.1,
}));

function renderChartCanvas(width = 800, height = 400) {
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
