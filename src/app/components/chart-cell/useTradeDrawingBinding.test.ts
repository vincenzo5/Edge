import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTradeDrawingBinding } from "./useTradeDrawingBinding";
import type { ChartHandle } from "./EdgeChart";

describe("useTradeDrawingBinding", () => {
  it("auto-binds a new position drawing when Trade panel is open and unbound", () => {
    const bindToDrawing = vi.fn();
    const updateBoundLevels = vi.fn();
    const chartRef = {
      current: {
        serializeDrawings: vi.fn().mockReturnValue([]),
      } as unknown as ChartHandle,
    };

    const { rerender } = renderHook(
      (props: { overlays: unknown[] }) =>
        useTradeDrawingBinding({
          chartRef,
          chartId: "cell-1",
          symbol: "AAPL",
          overlays: props.overlays,
          isActive: true,
          sidebar: { activePanel: "trade" } as never,
          tradeBinding: {
            bind: null,
            bindToDrawing,
            updateBoundLevels,
          } as never,
        }),
      { initialProps: { overlays: [] as unknown[] } },
    );

    chartRef.current!.serializeDrawings = vi.fn().mockReturnValue([
      {
        id: "draw-new",
        name: "long_position",
        points: [
          { x: 0, y: 100 },
          { x: 1, y: 95 },
          { x: 2, y: 110 },
        ],
      },
    ]);

    rerender({ overlays: [{}] });

    expect(bindToDrawing).toHaveBeenCalledWith("cell-1", "draw-new", "AAPL");
    expect(updateBoundLevels).toHaveBeenCalled();
  });
});
