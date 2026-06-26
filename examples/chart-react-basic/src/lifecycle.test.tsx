import { describe, expect, it } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { createRef } from "react";
import {
  createDefaultChartState,
  restoreChartState,
  serializeChartState,
} from "@edge/chart-core";
import EdgeChart, { type EdgeChartHandle } from "@edge/chart-react";
import { FIXTURE_CANDLES } from "./fixtures.js";

describe("chart-react-basic lifecycle", () => {
  it("serializes and restores chart state without app code", () => {
    const state = createDefaultChartState({ chartType: "area" });
    const roundTrip = restoreChartState(serializeChartState(state));
    expect(roundTrip.chartType).toBe("area");
    expect(roundTrip.version).toBe(1);
  });

  it("mount → read state → unmount", async () => {
    const ref = createRef<EdgeChartHandle>();
    const initial = createDefaultChartState({ chartType: "candle_solid" });

    const { unmount } = render(
      <EdgeChart
        ref={ref}
        candles={[...FIXTURE_CANDLES]}
        state={initial}
        theme="dark"
        symbol="DEMO"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getRawCandleCount()).toBe(FIXTURE_CANDLES.length);
    });

    const live = ref.current!.getState();
    expect(live.chartType).toBe("candle_solid");

    unmount();
    cleanup();
  });
});
