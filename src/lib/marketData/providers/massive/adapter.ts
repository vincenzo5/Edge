import type {
  MassiveAggregatesResponse,
  MassiveGroupedDailyResponse,
  MassiveSnapshotAllResponse,
} from "../../contracts/massive";
import type { EquityCandle } from "../../contracts/equities";
import type { FmpScreenerRow } from "../../contracts/fmp";
import type { OptionsChainRequest } from "../../contracts/options";
import { massiveApiKey, massiveGet } from "./client";
import { createMassiveOptionsProvider } from "./options";
import {
  indexGroupedDailyBars,
  mapMassiveGroupedBarToEquityCandle,
  mapMassiveSnapshotToScreenerRow,
  tradingDateToUtcMs,
} from "./mappers";

export function createMassiveProvider() {
  const options = createMassiveOptionsProvider();

  return {
    isConfigured(): boolean {
      return massiveApiKey() != null;
    },

    async getDailyMarketSummary(date: string): Promise<{
      bySymbol: Map<string, EquityCandle>;
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return { bySymbol: new Map(), warnings: ["MASSIVE_API_KEY is not configured"] };
      }
      const path = `/v2/aggs/grouped/locale/us/market/stocks/${date}`;
      const result = await massiveGet<MassiveGroupedDailyResponse>(path, {
        adjusted: "true",
      }, { allowPlanErrors: true });

      const bars = Array.isArray(result.data.results) ? result.data.results : [];
      return {
        bySymbol: indexGroupedDailyBars(bars, date),
        warnings: result.warnings,
      };
    },

    async getAggregates(args: {
      ticker: string;
      multiplier?: number;
      timespan?: "day" | "minute" | "hour";
      from: string;
      to: string;
      adjusted?: boolean;
    }): Promise<{ candles: EquityCandle[]; warnings: string[] }> {
      if (!this.isConfigured()) {
        return { candles: [], warnings: ["MASSIVE_API_KEY is not configured"] };
      }
      const sym = args.ticker.trim().toUpperCase();
      const multiplier = args.multiplier ?? 1;
      const timespan = args.timespan ?? "day";
      const path = `/v2/aggs/ticker/${sym}/range/${multiplier}/${timespan}/${args.from}/${args.to}`;
      const result = await massiveGet<MassiveAggregatesResponse>(
        path,
        { adjusted: String(args.adjusted ?? true) },
        { allowPlanErrors: true },
      );

      const bars = Array.isArray(result.data.results) ? result.data.results : [];
      const candles: EquityCandle[] = [];
      for (const bar of bars) {
        const candle = mapMassiveGroupedBarToEquityCandle(bar);
        if (candle) candles.push(candle);
      }
      candles.sort((a, b) => a.t - b.t);
      return { candles, warnings: result.warnings };
    },

    async getSnapshotAllTickers(): Promise<{
      rows: FmpScreenerRow[];
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return { rows: [], warnings: ["MASSIVE_API_KEY is not configured"] };
      }
      const result = await massiveGet<MassiveSnapshotAllResponse>(
        "/v2/snapshot/locale/us/markets/stocks/tickers",
        {},
        { allowPlanErrors: true },
      );
      const tickers = Array.isArray(result.data.tickers) ? result.data.tickers : [];
      const rows: FmpScreenerRow[] = [];
      for (const ticker of tickers) {
        const row = mapMassiveSnapshotToScreenerRow(ticker);
        if (row) rows.push(row);
      }
      return { rows, warnings: result.warnings };
    },

    /** UTC ms for a trading date string — test helper surface. */
    tradingDateToUtcMs,

    getOptionExpirationsWithWarnings(underlying: string) {
      return options.getOptionExpirationsWithWarnings(underlying);
    },

    getOptionsChainWithWarnings(request: OptionsChainRequest) {
      return options.getOptionsChainWithWarnings(request);
    },
  };
}

export type MassiveProvider = ReturnType<typeof createMassiveProvider>;
