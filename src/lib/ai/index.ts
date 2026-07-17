export type {
  AiTool,
  ToolDefinition,
  ToolPermission,
  PermissionMode,
  ToolResult,
  ExecuteToolOptions,
} from "./types";

export { defineTool } from "./types";

export type { ToolContext, AppActions, WatchlistActions, ChartBridgeActions } from "./context";

export {
  createServiceMarketDataPort,
  createFetchMarketDataPort,
  type MarketDataPort,
  type StockSearchResult,
} from "./marketDataPort";

export { ToolRegistry, createToolRegistry } from "./registry";
export { parseToolInput, schemaToJsonSchema, toToolDefinition } from "./validation";
export { executeTool, executeTools } from "./adapters/execute";
export { edgeToolRegistry, ALL_AI_TOOLS } from "./tools";

export { createServerToolContext } from "./adapters/http";
export { buildMcpToolHandlers } from "./adapters/mcp";

export {
  ToolRegistry as CoreToolRegistry,
  createToolRegistry as createCoreToolRegistry,
  defineTool as defineCoreTool,
  executeTool as executeCoreTool,
  type BaseToolContext,
} from "@edge/ai-tools-core";
