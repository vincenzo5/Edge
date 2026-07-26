import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import type { VisibleRange } from '@edge/chart-core';
import { useHistoryNavigatorCoordinator } from './useHistoryNavigatorCoordinator';
import type { HistoryNavigatorOverlayHandle } from './components/HistoryNavigatorOverlay';

function makeVp(startIndex: number, endIndex: number): VisibleRange {
  return {
    startIndex,
    endIndex,
    priceMin: 0,
    priceMax: 100,
    width: 800,
    height: 400,
    xForIndex: () => 0,
    yForPrice: () => 0,
    indexForX: () => 0,
    priceForY: () => 0,
  } as VisibleRange;
}

describe('useHistoryNavigatorCoordinator', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not throw when panning after seed viewport', () => {
    const overlayRef = createRef<HistoryNavigatorOverlayHandle | null>();
    const applyGeometry = vi.fn();
    const scheduleFade = vi.fn();
    const hideImmediate = vi.fn();
    overlayRef.current = { applyGeometry, scheduleFade, hideImmediate };

    const latestVpRef = { current: makeVp(10, 40) };
    const wheelingRef = { current: false };
    const candles = Array.from({ length: 100 }, (_, i) => ({
      t: 1_000_000 + i * 86_400_000,
      o: 1,
      h: 1,
      l: 1,
      c: 1,
      v: 1,
    }));
    const extent = {
      fromMs: candles[0]!.t,
      toMs: candles.at(-1)!.t,
      completeness: 'exact' as const,
    };

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useHistoryNavigatorCoordinator({
        enabled: true,
        historyExtent: extent,
        candles,
        width: 800,
        priceScaleSide: 'right',
        latestVpRef,
        wheelingRef,
        overlayRef,
      }),
    );

    act(() => {
      result.current.onViewportChange(makeVp(0, 30));
    });
    act(() => {
      result.current.onViewportChange(makeVp(5, 35));
    });

    expect(consoleError).not.toHaveBeenCalled();
    expect(applyGeometry).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
