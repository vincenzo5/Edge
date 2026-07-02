import type { Interval, Range } from "@/lib/chart/contracts";
import type { CandleRequest, CandleResponse, EquityQuote } from "../../contracts/equities";
import type { TwsContractDetails } from "../../contracts/marketContext";
import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../../contracts/options";
import { asFiniteNumber } from "../../validation/parseRequest";
import {
  createTwsClient,
  isTwsConfigured,
  type TwsClient,
  type TwsHistoryBar,
  type TwsStatusProbe,
} from "./client";
import { createTwsOptionsProvider, type TwsOptionsProvider } from "./optionsProvider";

export type TwsContractProbe = {
  symbol: string;
  conid: number;
  exchange?: string;
  companyName?: string;
};

export type TwsBatchQuoteResult = {
  quotes: EquityQuote[];
  missingSymbols: string[];
};

function mapHistoryBars(bars: TwsHistoryBar[]): CandleResponse["candles"] {
  return bars
    .map((bar) => {
      const t = asFiniteNumber(bar.t);
      const o = asFiniteNumber(bar.o);
      const h = asFiniteNumber(bar.h);
      const l = asFiniteNumber(bar.l);
      const c = asFiniteNumber(bar.c);
      if (t == null || o == null || h == null || l == null || c == null) return null;
      return {
        t,
        o,
        h,
        l,
        c,
        v: asFiniteNumber(bar.v) ?? undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

function mapQuoteRow(row: {
  symbol: string;
  shortName?: string;
  exchange?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  updatedAt: number;
}): EquityQuote {
  return {
    symbol: row.symbol,
    shortName: row.shortName,
    exchange: row.exchange,
    price: row.price,
    change: row.change,
    changePercent: row.changePercent,
    volume: row.volume,
    updatedAt: row.updatedAt ?? Date.now(),
  };
}

export function createTwsProvider(client?: TwsClient) {
  const tws = client ?? (isTwsConfigured() ? createTwsClient() : null);
  const options: TwsOptionsProvider = createTwsOptionsProvider(tws ?? undefined);

  return {
    isConfigured(): boolean {
      return tws != null;
    },

    getClient(): TwsClient | null {
      return tws;
    },

    async getStatusProbe(): Promise<TwsStatusProbe> {
      if (!tws) {
        return {
          configured: false,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["TWS_ENABLED is not true"],
        };
      }
      return tws.getStatus();
    },

    /**
     * Fast sidecar liveness probe (short timeout). Used to gate the full
     * status probe so chart-data requests do not block for the full sidecar
     * timeout when the sidecar is up but unresponsive.
     */
    async probeLiveness(timeoutMs = 2_000): Promise<boolean> {
      if (!tws) return false;
      return tws.probeLiveness(timeoutMs);
    },

    async probeStatus(timeoutMs = 2_000): Promise<TwsStatusProbe | null> {
      if (!tws) return null;
      return tws.probeStatus(timeoutMs);
    },

    async resolveContract(symbol: string): Promise<TwsContractProbe | null> {
      if (!tws) return null;
      return tws.resolveContract(symbol);
    },

    async getContractDetails(symbol: string): Promise<TwsContractDetails | null> {
      if (!tws) return null;
      const raw = await tws.getContractDetails(symbol);
      if (!raw) return null;
      return {
        symbol: raw.symbol,
        conid: raw.conid,
        secType: raw.secType ?? null,
        exchange: raw.exchange ?? null,
        primaryExchange: raw.primaryExchange ?? null,
        companyName: raw.companyName ?? null,
        industry: raw.industry ?? null,
        category: raw.category ?? null,
        subcategory: raw.subcategory ?? null,
      };
    },

    async warmup(symbols: string[]): Promise<void> {
      if (!tws) return;
      await tws.warmup(symbols);
    },

    async getQuote(symbol: string): Promise<EquityQuote | null> {
      const batch = await this.getQuotesBatch([symbol]);
      return batch.quotes[0] ?? null;
    },

    async getQuotesBatch(symbols: string[]): Promise<TwsBatchQuoteResult> {
      if (!tws || symbols.length === 0) {
        return { quotes: [], missingSymbols: symbols.map((s) => s.trim().toUpperCase()) };
      }
      const batch = await tws.getQuotesBatch(symbols);
      return {
        quotes: batch.quotes.map(mapQuoteRow),
        missingSymbols: batch.missingSymbols,
      };
    },

    async getQuotes(symbols: string[]): Promise<EquityQuote[] | null> {
      const batch = await this.getQuotesBatch(symbols);
      if (batch.quotes.length === 0) return null;
      return batch.quotes;
    },

    async getCandles(request: CandleRequest): Promise<CandleResponse | null> {
      if (!tws) return null;
      const sym = request.symbol.trim().toUpperCase();
      const range = request.range ?? "1mo";
      const data = await tws.getCandles({
        symbol: sym,
        interval: request.interval,
        range,
        before: request.beforeTimestamp,
        barCount: request.barCount,
        sessionMode: request.sessionMode,
      });
      if (!data) return null;
      const candles = mapHistoryBars(data.candles ?? []);
      return {
        symbol: sym,
        interval: request.interval,
        candles,
        hasMore: candles.length > 0 ? undefined : false,
      };
    },

    async getCandlesForRange(
      symbol: string,
      interval: Interval,
      range: Range,
    ): Promise<CandleResponse | null> {
      return this.getCandles({ symbol, interval, range });
    },

    async getOptionExpirations(underlying: string): Promise<OptionExpiration[] | null> {
      if (!tws) return null;
      const result = await options.getExpirations(underlying);
      if (result.expirations.length === 0) return null;
      return result.expirations;
    },

    async getOptionsChain(request: OptionsChainRequest): Promise<OptionsChainResponse | null> {
      if (!tws) return null;
      const result = await options.getChain(request);
      if (result.chain.contracts.length === 0) return null;
      return result.chain;
    },

    async getOptionExpirationsWithWarnings(underlying: string) {
      if (!tws) return null;
      return options.getExpirations(underlying);
    },

    async getOptionsChainWithWarnings(request: OptionsChainRequest) {
      if (!tws) return null;
      return options.getChain(request);
    },
  };
}

export type TwsProvider = ReturnType<typeof createTwsProvider>;
