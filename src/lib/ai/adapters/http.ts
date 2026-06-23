import type { ToolContext } from "../context";
import { createYahooMarketDataPort } from "../marketDataPort";
import {
  getChartCandles,
  getChartCandlesBefore,
  getFundamentalsSnapshot,
  getQuoteSnapshots,
  searchSymbols,
} from "@/lib/yahooFinance";

/** Build a server-side ToolContext for market-data tools (no browser session). */
export function createServerToolContext(): ToolContext {
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    marketData: createYahooMarketDataPort({
      searchSymbols,
      getChartCandles,
      getChartCandlesBefore,
      getQuoteSnapshots,
      getFundamentalsSnapshot,
    }),
  };
}
