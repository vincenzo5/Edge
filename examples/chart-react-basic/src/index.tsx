/**
 * SSR smoke check for CI — proves package imports without a browser build step.
 */
import { createDefaultChartState, restoreChartState, serializeChartState } from "@edge/chart-core";
import EdgeChart from "@edge/chart-react";
import { renderToString } from "react-dom/server";
import { FIXTURE_CANDLES } from "./fixtures.js";

function main() {
  const state = createDefaultChartState({ chartType: "candle_solid" });
  const serialized = serializeChartState(state);
  const restored = restoreChartState(serialized);

  const html = renderToString(
    <EdgeChart
      candles={[...FIXTURE_CANDLES]}
      state={restored}
      theme="dark"
      symbol="DEMO"
      range="1y"
      interval="1d"
      loading={false}
    />,
  );

  console.log(`Rendered chart HTML length: ${html.length}`);
  console.log(`Serialized state version: ${serialized.version}`);
  console.log(`Restored indicators: ${restored.indicators.length}`);
}

main();
