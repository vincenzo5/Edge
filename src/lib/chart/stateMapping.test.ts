import { describe, expect, it } from "vitest";
import { DEFAULT_CELL } from "@/lib/chartConfig";
import { cellConfigToChartState, chartStateToCellConfig } from "./stateMapping";

describe("stateMapping chartSettings timezone", () => {
  it("does not bake factory UTC when converting cell config to chart state", () => {
    const state = cellConfigToChartState({
      ...DEFAULT_CELL,
      chartSettings: { canvas: { showGrid: false } },
    });
    expect(state.chartSettings?.symbol).toBeUndefined();
    expect(
      (state.chartSettings as { canvas?: { showGrid?: boolean } } | undefined)?.canvas
        ?.showGrid,
    ).toBe(false);
  });

  it("strips legacy factory UTC when converting chart state back to cell config", () => {
    const cell = chartStateToCellConfig(
      {
        version: 1,
        chartType: "candle_solid",
        indicators: [],
        drawings: [],
        chartSettings: { symbol: { timeZone: "UTC" }, canvas: { showGrid: false } },
      },
      DEFAULT_CELL,
    );
    expect(cell.chartSettings?.symbol?.timeZone).toBeUndefined();
    expect(cell.chartSettings?.canvas?.showGrid).toBe(false);
  });
});
