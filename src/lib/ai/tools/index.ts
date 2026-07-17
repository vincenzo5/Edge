import { CLIENT_AI_TOOLS } from "./clientTools";
import { patternLibraryTools } from "./patternLibrary";
import { createToolRegistry } from "../registry";

export const ALL_AI_TOOLS = [...CLIENT_AI_TOOLS, ...patternLibraryTools];

export const edgeToolRegistry = createToolRegistry(ALL_AI_TOOLS);

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
} from "./clientTools";
export { patternLibraryTools };
