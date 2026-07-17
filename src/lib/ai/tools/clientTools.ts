import { chartTools } from "./chart";
import { marketDataTools } from "./marketData";
import { indicatorTools } from "./indicators";
import { drawingTools } from "./drawings";
import { watchlistTools } from "./watchlist";
import { workflowTools } from "./workflow";
import { screenerTools } from "./screener";
import { sessionStateTools } from "./sessionState";
import { tradingTools } from "./trading";
import { createToolRegistry } from "../registry";

/** Tools safe to register in the browser (no node:fs or server-only deps). */
export const CLIENT_AI_TOOLS = [
  ...marketDataTools,
  ...chartTools,
  ...indicatorTools,
  ...drawingTools,
  ...watchlistTools,
  ...workflowTools,
  ...screenerTools,
  ...sessionStateTools,
  ...tradingTools,
];

export const clientToolRegistry = createToolRegistry(CLIENT_AI_TOOLS);

export {
  chartTools,
  marketDataTools,
  indicatorTools,
  drawingTools,
  watchlistTools,
  workflowTools,
  screenerTools,
  sessionStateTools,
  tradingTools,
};
