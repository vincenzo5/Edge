import "server-only";

import {
  getChartCandles,
  getChartCandlesBefore,
  getFundamentalsSnapshot,
  getQuoteSnapshots,
  searchSymbols,
} from "@/lib/yahooFinance";
import {
  createMarketDataService,
  type MarketDataService,
} from "./marketDataService";

let singleton: MarketDataService | null = null;

export function getServerMarketDataService(): MarketDataService {
  if (!singleton) {
    singleton = createMarketDataService({
      yahoo: {
        searchSymbols,
        getChartCandles,
        getChartCandlesBefore,
        getQuoteSnapshots,
        getFundamentalsSnapshot,
      },
    });
  }
  return singleton;
}

export { clearMarketDataCacheForTests } from "./marketDataService";
