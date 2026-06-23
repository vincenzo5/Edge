import { chartTools } from "./chart";
import { marketDataTools } from "./marketData";
import { indicatorTools } from "./indicators";
import { drawingTools } from "./drawings";
import { watchlistTools } from "./watchlist";
import { workflowTools } from "./workflow";
import { createToolRegistry } from "../registry";

export const ALL_AI_TOOLS = [
  ...marketDataTools,
  ...chartTools,
  ...indicatorTools,
  ...drawingTools,
  ...watchlistTools,
  ...workflowTools,
];

export const edgeToolRegistry = createToolRegistry(ALL_AI_TOOLS);

export {
  chartTools,
  marketDataTools,
  indicatorTools,
  drawingTools,
  watchlistTools,
  workflowTools,
};
