import type { CandleRequest, CandleResponse } from "../contracts/equities";
import type { InstrumentSearchResult } from "../contracts/instruments";
import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../contracts/options";
import type { MarketEventsQuery } from "../contracts/events";
import type {
  FmpMarketMoverKind,
  FmpStatementPeriod,
} from "../contracts/fmp";
import type { ScreenQuery } from "../schemas/request";
import type { DerivedMetricKind } from "../contracts/derived";
import { createDataResult, type DataResult } from "../contracts/result";
import { buildCacheKey, cacheTtlMs } from "../cache";
import {
  clearMarketDataCacheForTests as clearLegacyDataCacheForTests,
  globalDataCache,
} from "../cache/serverCacheBackends";
import { clearHotStoreForTests } from "../hotStore";
import { createYahooProvider, type YahooFinanceClient } from "../providers/yahoo/adapter";
import { createSecProvider } from "../providers/sec/adapter";
import { createFredProvider } from "../providers/fred/adapter";
import { createFmpProvider } from "../providers/fmp/adapter";
import { createMassiveProvider, type MassiveProvider } from "../providers/massive/adapter";
import {
  createIbkrProvider,
  type IbkrContractProbe,
  type IbkrProvider,
  type IbkrStatusProbe,
} from "../providers/ibkr/adapter";
import {
  createTwsProvider,
  type TwsContractProbe,
  type TwsProvider,
} from "../providers/tws/adapter";
import type { TwsStatusProbe } from "../providers/tws/client";
import {
  getCandles,
  getLegacyCandles,
} from "./candlesFetch";
import {
  getFundamentals,
  getMarketContext,
  getMacroReleases,
  getMacroSeries,
  getDerivedMetric,
  getSecCompanyFacts,
  getSecFilings,
  getWatchlistFundamentals,
  getWatchlistFundamentalsBatch,
} from "./contextAndFundamentals";
import {
  getCorporateEvents,
  getMarketEvents,
  getNews,
} from "./eventsRoutes";
import {
  getFmpAnalystEstimates,
  getFmpCompanyProfile,
  getFmpExecutives,
  getFmpFinancials,
  getFmpMarketMovers,
  getFmpSecFilings,
} from "./fmpRoutes";
import { resetIbkrHealthGateForTests } from "../providers/ibkr/healthGate";
import { resetTwsHealthGateForTests } from "../providers/tws/healthGate";
import { resetDeliveryRegistryForTests } from "../state/deliveryRegistry";
import {
  getOptionExpirations,
  getOptionsChain,
} from "./optionsFetch";
import {
  getIbkrCandlesProbe,
  getIbkrContractProbe,
  getIbkrQuoteProbe,
  getIbkrStatusProbe,
  getTwsCandlesProbe,
  getTwsContractProbe,
  getTwsQuoteProbe,
  getTwsStatusProbe,
  primeMarketData,
  resetTwsRecoveryState,
  resolveQuoteStreamTransport,
} from "./probesAndWarmup";
import {
  getQuotes,
  getWatchlistQuotes,
} from "./quotesFetch";
import { getScreenerResults } from "./screenerRoutes";
import type { MarketDataServiceHost } from "./marketDataServiceHost";
import {
  type MarketDataReadOptions,
  type QuoteStreamTransport,
} from "./marketDataServiceShared";

export type { MarketDataReadOptions, QuoteStreamTransport } from "./marketDataServiceShared";
export type { MarketDataServiceHost } from "./marketDataServiceHost";

export type MarketDataServiceDeps = {
  yahoo: YahooFinanceClient;
  ibkr?: IbkrProvider;
  tws?: TwsProvider;
  massive?: MassiveProvider;
};

export class MarketDataService implements MarketDataServiceHost {
  yahoo;
  sec;
  fred;
  fmp;
  massive;
  ibkr;
  tws;
  candlesRevalidateKeys = new Set<string>();
  quotesRevalidateKey: string | null = null;
  optionExpRevalidateKeys = new Set<string>();
  optionsChainRevalidateKeys = new Set<string>();
  twsGatewayProbeAt = 0;
  twsGatewayConnected = true;
  lastTwsStatusProbe: TwsStatusProbe | null = null;
  lastTwsStatusObservedAt = 0;
  ibkrAuthProbeAt = 0;
  ibkrAuthenticated = true;

  constructor(deps: MarketDataServiceDeps) {
    this.yahoo = createYahooProvider(deps.yahoo);
    this.sec = createSecProvider();
    this.fred = createFredProvider();
    this.fmp = createFmpProvider();
    this.massive = deps.massive ?? createMassiveProvider();
    this.ibkr = deps.ibkr ?? createIbkrProvider();
    this.tws = deps.tws ?? createTwsProvider();
  }

  async searchInstruments(
    query: string,
    limit = 8,
  ): Promise<DataResult<InstrumentSearchResult[]>> {
    const requestedAt = Date.now();
    const trimmed = query.trim();
    if (!trimmed) {
      return createDataResult([], "yahoo", { requestedAt });
    }
    const cacheKey = buildCacheKey(["search", trimmed, limit]);
    const cached = await Promise.resolve(globalDataCache.read<InstrumentSearchResult[]>("search", cacheKey));
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "yahoo", {
        requestedAt,
        stale: false,
        asOf: cached.asOf,
        warnings: [],
      });
    }
    const data = await this.yahoo.searchInstruments(trimmed, limit);
    await Promise.resolve(globalDataCache.write("search", cacheKey, data, cacheTtlMs("search"), Date.now()));
    return createDataResult(data, "yahoo", { requestedAt });
  }

  getCandles(request: CandleRequest, options: MarketDataReadOptions = {}) {
    return getCandles(this, request, options);
  }

  getLegacyCandles(request: CandleRequest, options: MarketDataReadOptions = {}) {
    return getLegacyCandles(this, request, options);
  }

  getQuotes(symbols: string[], options: MarketDataReadOptions = {}) {
    return getQuotes(this, symbols, options);
  }

  getWatchlistQuotes(symbols: string[], options: MarketDataReadOptions = {}) {
    return getWatchlistQuotes(this, symbols, options);
  }

  getFundamentals(symbol: string) {
    return getFundamentals(this, symbol);
  }

  getWatchlistFundamentals(symbol: string) {
    return getWatchlistFundamentals(this, symbol);
  }

  getWatchlistFundamentalsBatch(symbols: string[]) {
    return getWatchlistFundamentalsBatch(this, symbols);
  }

  getMarketContext(symbol: string) {
    return getMarketContext(this, symbol);
  }

  getSecCompanyFacts(symbol: string) {
    return getSecCompanyFacts(this, symbol);
  }

  getSecFilings(symbol: string, limit = 10) {
    return getSecFilings(this, symbol, limit);
  }

  getMacroSeries(seriesId: string, limit = 120) {
    return getMacroSeries(this, seriesId, limit);
  }

  getMacroReleases(limit = 20) {
    return getMacroReleases(this, limit);
  }

  getMarketEvents(query: MarketEventsQuery) {
    return getMarketEvents(this, query);
  }

  getCorporateEvents(args: {
    symbol?: string;
    from?: string;
    to?: string;
  }) {
    return getCorporateEvents(this, args);
  }

  getNews(args: { symbol?: string; limit?: number }) {
    return getNews(this, args);
  }

  getFmpCompanyProfile(symbol: string) {
    return getFmpCompanyProfile(this, symbol);
  }

  getFmpAnalystEstimates(args: {
    symbol: string;
    period?: FmpStatementPeriod;
    limit?: number;
  }) {
    return getFmpAnalystEstimates(this, args);
  }

  getFmpFinancials(args: {
    symbol: string;
    period?: FmpStatementPeriod;
    limit?: number;
  }) {
    return getFmpFinancials(this, args);
  }

  getFmpExecutives(symbol: string) {
    return getFmpExecutives(this, symbol);
  }

  getFmpSecFilings(args: {
    symbol: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    return getFmpSecFilings(this, args);
  }

  getFmpMarketMovers(args: { kind?: FmpMarketMoverKind; limit?: number }) {
    return getFmpMarketMovers(this, args);
  }

  getScreenerResults(query: ScreenQuery, options: MarketDataReadOptions = {}) {
    return getScreenerResults(this, query, options);
  }

  getOptionExpirations(underlying: string) {
    return getOptionExpirations(this, underlying);
  }

  getOptionsChain(request: OptionsChainRequest, options: MarketDataReadOptions = {}) {
    return getOptionsChain(this, request, options);
  }

  getDerivedMetric(symbol: string, kind: DerivedMetricKind) {
    return getDerivedMetric(this, symbol, kind);
  }

  getIbkrStatusProbe() {
    return getIbkrStatusProbe(this);
  }

  getIbkrContractProbe(symbol: string) {
    return getIbkrContractProbe(this, symbol);
  }

  getIbkrQuoteProbe(symbol: string) {
    return getIbkrQuoteProbe(this, symbol);
  }

  getIbkrCandlesProbe(args: {
    symbol: string;
    interval: CandleRequest["interval"];
    range: NonNullable<CandleRequest["range"]>;
  }) {
    return getIbkrCandlesProbe(this, args);
  }

  getIbkrProvider(): IbkrProvider {
    return this.ibkr;
  }

  getTwsStatusProbe(options: { bypassCircuit?: boolean } = {}) {
    return getTwsStatusProbe(this, options);
  }

  getTwsContractProbe(symbol: string) {
    return getTwsContractProbe(this, symbol);
  }

  getTwsQuoteProbe(symbol: string) {
    return getTwsQuoteProbe(this, symbol);
  }

  getTwsCandlesProbe(args: {
    symbol: string;
    interval: CandleRequest["interval"];
    range: NonNullable<CandleRequest["range"]>;
  }) {
    return getTwsCandlesProbe(this, args);
  }

  getTwsProvider(): TwsProvider {
    return this.tws;
  }

  resolveQuoteStreamTransport() {
    return resolveQuoteStreamTransport(this);
  }

  resetTwsRecoveryState(args: {
    symbols?: string[];
    candleRequests?: CandleRequest[];
  } = {}) {
    return resetTwsRecoveryState(this, args);
  }

  primeMarketData(args: {
    symbols?: string[];
    candleRequests?: CandleRequest[];
    optionsSymbol?: string;
    activeCellIndex?: number;
    traceId?: string;
  }) {
    return primeMarketData(this, args);
  }
}

export function createMarketDataService(deps: MarketDataServiceDeps): MarketDataService {
  return new MarketDataService(deps);
}

export { resetTwsHealthGateForTests, resetIbkrHealthGateForTests, clearHotStoreForTests };

export function clearMarketDataCacheForTests(): void {
  clearLegacyDataCacheForTests();
  clearHotStoreForTests();
  resetDeliveryRegistryForTests();
}
