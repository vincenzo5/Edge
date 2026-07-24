import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { RefObject } from "react";
import { DEFAULT_CELL } from "@/lib/chartConfig";
import { useViewportPersistSync } from "./useViewportPersistSync";

function createChartRef(overrides: Partial<{
  isViewportModified: () => boolean;
  getVisibleRange: () => {
    startIndex: number;
    endIndex: number;
    priceMin: number;
    priceMax: number;
    priceScaleMode?: "auto" | "manual";
  } | null;
  applyViewportSnapshot: (snapshot: unknown) => boolean;
}> = {}) {
  const chart = {
    isViewportModified: () => false,
    getVisibleRange: () => null,
    applyViewportSnapshot: () => true,
    ...overrides,
  };
  return { current: chart } as RefObject<typeof chart>;
}

describe("useViewportPersistSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists viewport when modified after debounce", () => {
    const onConfigChange = vi.fn();
    const chartRef = createChartRef({
      isViewportModified: () => true,
      getVisibleRange: () => ({
        startIndex: 20,
        endIndex: 120,
        priceMin: 90,
        priceMax: 110,
        priceScaleMode: "manual",
      }),
    });

    const { result } = renderHook(() =>
      useViewportPersistSync({
        chartRef,
        config: { ...DEFAULT_CELL },
        onConfigChange,
        candleCount: 200,
        sessionKey: "AAPL|1y|1d",
      }),
    );

    act(() => {
      result.current.markViewportDirty();
      vi.advanceTimersByTime(500);
    });

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        viewport: {
          startIndex: 20,
          endIndex: 120,
          priceMin: 90,
          priceMax: 110,
          priceScaleMode: "manual",
        },
      }),
    );
  });

  it("clears viewport when chart returns to default fit", async () => {
    const onConfigChange = vi.fn();
    const chartRef = createChartRef({
      isViewportModified: () => false,
    });

    const { result } = renderHook(() =>
      useViewportPersistSync({
        chartRef,
        config: {
          ...DEFAULT_CELL,
          viewport: {
            startIndex: 1,
            endIndex: 50,
            priceMin: 1,
            priceMax: 2,
          },
        },
        onConfigChange,
        candleCount: 200,
        sessionKey: "AAPL|1y|1d",
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
      result.current.markViewportDirty();
      vi.advanceTimersByTime(500);
    });

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ viewport: undefined }),
    );
  });

  it("restores persisted viewport once per session", () => {
    const onConfigChange = vi.fn();
    const applyViewportSnapshot = vi.fn(() => true);
    const chartRef = createChartRef({ applyViewportSnapshot });

    renderHook(() =>
      useViewportPersistSync({
        chartRef,
        config: {
          ...DEFAULT_CELL,
          viewport: {
            startIndex: 10,
            endIndex: 80,
            priceMin: 95,
            priceMax: 105,
            priceScaleMode: "manual",
          },
        },
        onConfigChange,
        candleCount: 200,
        sessionKey: "AAPL|1y|1d",
      }),
    );

    expect(applyViewportSnapshot).toHaveBeenCalledWith({
      startIndex: 10,
      endIndex: 80,
      priceMin: 95,
      priceMax: 105,
      priceScaleMode: "manual",
    });
  });

  it("clearPersistedViewport removes viewport from config", () => {
    const onConfigChange = vi.fn();
    const chartRef = createChartRef();

    const { result } = renderHook(() =>
      useViewportPersistSync({
        chartRef,
        config: {
          ...DEFAULT_CELL,
          viewport: {
            startIndex: 1,
            endIndex: 50,
            priceMin: 1,
            priceMax: 2,
          },
        },
        onConfigChange,
        candleCount: 200,
        sessionKey: "AAPL|1y|1d",
      }),
    );

    act(() => {
      result.current.clearPersistedViewport();
    });

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ viewport: undefined }),
    );
  });

  it("flushViewportPersist writes pending viewport immediately", () => {
    const onConfigChange = vi.fn();
    const chartRef = createChartRef({
      isViewportModified: () => true,
      getVisibleRange: () => ({
        startIndex: 5,
        endIndex: 55,
        priceMin: 10,
        priceMax: 20,
        priceScaleMode: "auto",
      }),
    });

    const { result } = renderHook(() =>
      useViewportPersistSync({
        chartRef,
        config: { ...DEFAULT_CELL },
        onConfigChange,
        candleCount: 200,
        sessionKey: "AAPL|1y|1d",
      }),
    );

    act(() => {
      result.current.markViewportDirty();
      result.current.flushViewportPersist();
    });

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        viewport: {
          startIndex: 5,
          endIndex: 55,
          priceMin: 10,
          priceMax: 20,
          priceScaleMode: "auto",
        },
      }),
    );
  });
});
