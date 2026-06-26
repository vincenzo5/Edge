import type { ToolContext } from "../context";
import { createServiceMarketDataPort } from "../marketDataPort";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

/** Build a server-side ToolContext for market-data tools (no browser session). */
export function createServerToolContext(): ToolContext {
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    marketData: createServiceMarketDataPort(getServerMarketDataService()),
  };
}
