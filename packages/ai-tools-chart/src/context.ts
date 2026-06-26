import type { BaseToolContext } from "@edge/ai-tools-core";
import type { SerializedChartState, VisibleRange } from "@edge/chart-core";

/** Minimal chart session port for safe public chart tools. */
export type ChartSessionPort = {
  getState: () => SerializedChartState;
  setState: (state: SerializedChartState) => void;
  getVisibleRange: () => VisibleRange | null;
  getSymbol: () => string;
};

export type ChartToolContext = BaseToolContext & {
  chart: ChartSessionPort;
};
