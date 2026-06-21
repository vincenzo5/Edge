import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ChartCanvas from './canvas';
import type { ChartPaneHandle } from './paneHandle';
import type { Candle } from './contracts';

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
