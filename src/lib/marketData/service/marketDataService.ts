import type { CandleRequest, CandleResponse, EquityQuote } from "../contracts/equities";
import type { FundamentalsSnapshot, SecCompanyFacts, SecFiling } from "../contracts/fundamentals";
import type { InstrumentSearchResult } from "../contracts/instruments";
import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../contracts/options";
import type { CorporateEvent, MarketEvent, MarketEventsQuery } from "../contracts/events";
import type { NewsItem } from "../contracts/news";
import type { MacroSeries, EconomicRelease } from "../contracts/macro";
import type {
  FmpAnalystEstimate,
  FmpCompanyProfile,
  FmpExecutive,
  FmpFinancialsBundle,
  FmpMarketMover,
  FmpMarketMoverKind,
  FmpScreenerRow,
  FmpSecFiling,
  FmpStatementPeriod,
} from "../contracts/fmp";
import type { ScreenQuery } from "../schemas/request";
import { runTechnicalFilter, TECHNICAL_FILTER_CONCURRENCY, TECHNICAL_FILTER_MASSIVE_FALLBACK_CONCURRENCY, TECHNICAL_FILTER_MAX_CANDIDATES, TECHNICAL_FILTER_UNIVERSE_CONCURRENCY } from "@/lib/screener/technicalFilter";
import { minCandlesForTechnicalRule, rangeForTechnicalRule } from "@/lib/screener/technicalMath";
import {
  applyDescriptiveFilters,
  ensureScreenerUniverseWarm,
  fetchUniverseDescriptors,
  getCandlesFromUniverseStore,
} from "../screenerUniverse/universeDailyStore";
import {
  buildDescriptorMap,
  enrichMoversWithDescriptors,
} from "../screenerUniverse/enrichMoversWithDescriptors";
import type { DerivedMetric, DerivedMetricKind } from "../contracts/derived";
import type { MarketContext } from "../contracts/marketContext";
import { buildMarketContext } from "../context/buildMarketContext";
import { latestCompletedTradingDate } from "../marketCalendar";
import { createDataResult, type DataCacheTier, type DataResult, type MarketDataPerfPhase } from "../contracts/result";
import type { WarmupPhaseReport, WarmupReport } from "../telemetry/types";
import { isMarketDataPerfEnabled } from "../telemetry/isPerfEnabled";
import { PerfPhaseCollector } from "../telemetry/perfPhases";
import {
  buildCacheKey,
  cacheTtlMs,
  globalDataCache,
  clearMarketDataCacheForTests as clearLegacyDataCacheForTests,
} from "../cache";
import {
  clearHotStoreForTests,
  globalHotStore,
  hotCandlesKey,
  hotOptionExpirationsKey,
  hotOptionsChainKey,
  hotQuoteKey,
  invalidateHotRecoveryKeys,
  writeHotCandles,
  writeHotOptionExpirations,
  writeHotOptionsChain,
  writeHotQuote,
} from "../hotStore";
import { createYahooProvider, type YahooFinanceClient } from "../providers/yahoo/adapter";
import { createSecProvider } from "../providers/sec/adapter";
import { createFredProvider } from "../providers/fred/adapter";
import { createFmpProvider } from "../providers/fmp/adapter";
import { createMassiveProvider, type MassiveProvider } from "../providers/massive/adapter";
import { createTradierOptionsProvider } from "../providers/tradier/adapter";
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
import { isStaleTwsSidecarHealth } from "../providers/tws/client";
import {
  classifyIbkrError,
  ibkrHealthGate,
  resetIbkrHealthGateForTests,
  type IbkrWorkload,
} from "../providers/ibkr/healthGate";
import {
  classifyTwsError,
  resetTwsHealthGateForTests,
  twsHealthGate,
  type TwsWorkload,
} from "../providers/tws/healthGate";

const TWS_GATEWAY_PROBE_TTL_MS = 15_000;
const IBKR_AUTH_PROBE_TTL_MS = 15_000;
const TWS_WARMUP_BUDGET_MS = 5_000;
import { defaultFmpSecFilingDateWindow } from "../providers/fmp/client";
import {
  dedupeMarketEvents,
  defaultFamiliesForQuery,
  filterMarketEvents,
  marketEventToCorporateEvent,
  normalizeFmpCorporateEvent,
  normalizeFmpEconomicCalendarEvents,
  normalizeFmpSecFiling,
  normalizeFredReleases,
  normalizeSecFiling,
} from "../events";
import { PRIORITY_ONE_MACRO_IDS } from "../events/registry";
import {
  equityCandleToLegacyApi,
  equityQuoteToWatchlistQuote,
  fundamentalsToWatchlist,
} from "../validation/mappers";
import type { QuoteSnapshot, FundamentalsSnapshot as WatchlistFundamentals } from "@/lib/watchlist/types";

export type MarketDataServiceDeps = {
  yahoo: YahooFinanceClient;
  /** Optional override for unit tests; defaults to env-driven IBKR provider. */
  ibkr?: IbkrProvider;
  /** Optional override for unit tests; defaults to env-driven TWS provider. */
  tws?: TwsProvider;
  /** Optional override for unit tests; defaults to env-driven Massive provider. */
  massive?: MassiveProvider;
};

function hotCacheTier(fresh: boolean): DataCacheTier {
  return fresh ? "hot-fresh" : "hot-stale";
}

function oldestQuoteUpdatedAt(quotes: EquityQuote[]): number | undefined {
  if (quotes.length === 0) return undefined;
  return Math.min(...quotes.map((quote) => quote.updatedAt));
}

function recentIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

type MarketDataReadOptions = {
  traceId?: string;
  perf?: PerfPhaseCollector | null;
  /** TWS sidecar socket for display/trading-scoped market data (ib-paper | ib-live). */
  twsConnectionId?: string;
};

function attachPerfMeta<T extends DataResult<unknown>>(
  result: T,
  traceId: string | undefined,
  collector: PerfPhaseCollector | null,
): T {
  if (!collector || !isMarketDataPerfEnabled()) return result;
  return {
    ...result,
    traceId,
    phases: [...(collector.toArray()), ...(result.phases ?? [])],
  };
}

export type QuoteStreamTransport = "tws" | "ibkr" | "poll";

export class MarketDataService {
  private yahoo;
  private sec;
  private fred;
  private fmp;
  private massive;
  private tradier;
  private ibkr;
  private tws;
  private candlesRevalidateKeys = new Set<string>();
  private quotesRevalidateKey: string | null = null;
  private optionExpRevalidateKeys = new Set<string>();
  private optionsChainRevalidateKeys = new Set<string>();
  private twsGatewayProbeAt = 0;
  private twsGatewayConnected = true;
  private ibkrAuthProbeAt = 0;
  private ibkrAuthenticated = true;

  constructor(deps: MarketDataServiceDeps) {
    this.yahoo = createYahooProvider(deps.yahoo);
    this.sec = createSecProvider();
    this.fred = createFredProvider();
    this.fmp = createFmpProvider();
    this.massive = deps.massive ?? createMassiveProvider();
    this.tradier = createTradierOptionsProvider();
    this.ibkr = deps.ibkr ?? createIbkrProvider();
    this.tws = deps.tws ?? createTwsProvider();
  }

  private candlesCacheKey(
    provider: string,
    request: CandleRequest,
    connectionId?: string,
  ): string {
    return buildCacheKey([
      "candles",
      provider,
      connectionId ?? "",
      request.symbol,
      request.range ?? "",
      request.interval,
      request.beforeTimestamp ?? "",
      request.barCount ?? "",
      request.sessionMode ?? "regular",
    ]);
  }

  private quotesCacheKey(provider: string, symbols: string[], connectionId?: string): string {
    return buildCacheKey(["quotes", provider, connectionId ?? "", symbols.join(",")]);
  }

  private optionExpirationsCacheKey(provider: string, underlying: string): string {
    return buildCacheKey(["options-exp", provider, underlying]);
  }

  private twsRoutingDecision(workload: TwsWorkload): { shouldTry: boolean; warning?: string } {
    if (!this.tws.isConfigured()) {
      return { shouldTry: false };
    }
    if (twsHealthGate.shouldTryTws(workload)) {
      return { shouldTry: true };
    }
    const skipReason = twsHealthGate.getSkipReason();
    return {
      shouldTry: false,
      warning: skipReason ?? "TWS temporarily skipped (circuit open)",
    };
  }

  private recordTwsSuccess(symbol?: string): void {
    twsHealthGate.recordSuccess();
    if (symbol) {
      void this.tws.warmup?.([symbol]).catch(() => {});
    }
  }

  private recordTwsFailure(error: unknown): void {
    twsHealthGate.recordFailure(classifyTwsError(error));
  }

  private ibkrRoutingDecision(workload: IbkrWorkload): { shouldTry: boolean; warning?: string } {
    if (!this.ibkr.isConfigured()) {
      return { shouldTry: false };
    }
    if (ibkrHealthGate.shouldTryIbkr(workload)) {
      return { shouldTry: true };
    }
    const skipReason = ibkrHealthGate.getSkipReason();
    return {
      shouldTry: false,
      warning: skipReason ?? "IBKR temporarily skipped (circuit open)",
    };
  }

  private recordIbkrSuccess(): void {
    ibkrHealthGate.recordSuccess();
  }

  private recordIbkrFailure(error: unknown): void {
    ibkrHealthGate.recordFailure(classifyIbkrError(error));
  }

  /** Proactively open the TWS circuit when Gateway is known disconnected or sidecar wedged. */
  private async ensureTwsGatewayProbe(): Promise<void> {
    if (!this.tws.isConfigured()) return;
    if (!twsHealthGate.shouldTryTws("status")) {
      return;
    }
    const now = Date.now();
    if (now - this.twsGatewayProbeAt < TWS_GATEWAY_PROBE_TTL_MS) {
      if (!this.twsGatewayConnected) {
        twsHealthGate.recordFailure("gateway_disconnected");
      }
      return;
    }
    const status = await this.tws.probeStatus?.(2_000);
    this.twsGatewayProbeAt = now;
    if (!status?.sidecarReachable) {
      this.twsGatewayConnected = false;
      twsHealthGate.recordFailure("sidecar_unreachable");
      return;
    }
    if (status.restartRequired || status.diagnostics?.workerWedged) {
      this.twsGatewayConnected = false;
      twsHealthGate.recordFailure("provider_error");
      return;
    }
    this.twsGatewayConnected = status.gatewayConnected;
    if (!status.gatewayConnected) {
      twsHealthGate.recordFailure("gateway_disconnected");
    }
  }

  /** Proactively open the IBKR circuit when Client Portal is known unauthenticated. */
  private async ensureIbkrAuthProbe(): Promise<void> {
    if (!this.ibkr.isConfigured()) return;
    const now = Date.now();
    if (now - this.ibkrAuthProbeAt < IBKR_AUTH_PROBE_TTL_MS) {
      if (!this.ibkrAuthenticated) {
        ibkrHealthGate.recordUnauthenticated();
      }
      return;
    }
    try {
      const status = await this.ibkr.getStatusProbe();
      this.ibkrAuthProbeAt = now;
      this.ibkrAuthenticated = status.authenticated;
      if (status.gatewayReachable && !status.authenticated) {
        ibkrHealthGate.recordUnauthenticated();
      }
    } catch {
      this.ibkrAuthProbeAt = now;
      this.ibkrAuthenticated = false;
      ibkrHealthGate.recordFailure("gateway_unreachable");
    }
  }

  private optionsChainCacheKey(
    provider: string,
    underlying: string,
    expiration: string,
    strikeWindow?: OptionsChainRequest["strikeWindow"],
  ): string {
    const windowKey =
      !strikeWindow || strikeWindow.mode === "full"
        ? "full"
        : `atm:${strikeWindow.count ?? 20}:${strikeWindow.spot ?? "auto"}`;
    return buildCacheKey(["options-chain", provider, underlying, expiration, windowKey]);
  }

  private async fetchTradierOptionExpirations(
    underlying: string,
    requestedAt: number,
    extraWarnings: string[] = [],
  ): Promise<DataResult<OptionExpiration[]>> {
    if (!this.tradier.isConfigured()) {
      return createDataResult([], "tradier", {
        requestedAt,
        warnings: [
          ...extraWarnings,
          "TRADIER_ACCESS_TOKEN is not configured",
        ],
      });
    }
    const sym = underlying.trim().toUpperCase();
    const cacheKey = this.optionExpirationsCacheKey("tradier", sym);
    const cached = globalDataCache.read<OptionExpiration[]>("options_expirations", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "tradier", {
        requestedAt,
        asOf: cached.asOf,
        warnings: extraWarnings,
      });
    }
    const data = await this.tradier.getExpirations(sym);
    globalDataCache.write(
      "options_expirations",
      cacheKey,
      data,
      cacheTtlMs("options_expirations"),
      Date.now(),
    );
    return createDataResult(data, "tradier", { requestedAt, warnings: extraWarnings });
  }

  private async fetchTradierOptionsChain(
    request: OptionsChainRequest,
    requestedAt: number,
    extraWarnings: string[] = [],
  ): Promise<DataResult<OptionsChainResponse>> {
    if (!this.tradier.isConfigured()) {
      return createDataResult(
        {
          underlying: request.underlying.toUpperCase(),
          expiration: request.expiration ?? "",
          contracts: [],
        },
        "tradier",
        {
          requestedAt,
          warnings: [
            ...extraWarnings,
            "TRADIER_ACCESS_TOKEN is not configured",
          ],
        },
      );
    }
    const underlying = request.underlying.toUpperCase();
    const expiration = request.expiration ?? "";
    const cacheKey = this.optionsChainCacheKey("tradier", underlying, expiration);
    const cached = globalDataCache.read<OptionsChainResponse>("options_chain", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "tradier", {
        requestedAt,
        asOf: cached.asOf,
        warnings: extraWarnings,
      });
    }
    const data = await this.tradier.getChain(request);
    globalDataCache.write(
      "options_chain",
      cacheKey,
      data,
      cacheTtlMs("options_chain"),
      Date.now(),
    );
    return createDataResult(data, "tradier", { requestedAt, warnings: extraWarnings });
  }

  private async fetchYahooCandles(
    request: CandleRequest,
    requestedAt: number,
  ): Promise<DataResult<CandleResponse>> {
    const cacheKey = this.candlesCacheKey("yahoo", request);
    const cached = globalDataCache.read<CandleResponse>("candles", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "yahoo", {
        requestedAt,
        asOf: cached.asOf,
      });
    }
    const data = await this.yahoo.getCandles(request);
    globalDataCache.write(
      "candles",
      cacheKey,
      data,
      cacheTtlMs("candles", request.interval),
      Date.now(),
    );
    return createDataResult(data, "yahoo", { requestedAt });
  }

  private async fetchYahooQuotes(
    symbols: string[],
    requestedAt: number,
    extraWarnings: string[] = [],
  ): Promise<DataResult<EquityQuote[]>> {
    const cacheKey = this.quotesCacheKey("yahoo", symbols);
    const cached = globalDataCache.read<EquityQuote[]>("quotes", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "yahoo", {
        requestedAt,
        asOf: cached.asOf,
        warnings: extraWarnings,
      });
    }
    const data = await this.yahoo.getQuotes(symbols);
    globalDataCache.write("quotes", cacheKey, data, cacheTtlMs("quotes"), Date.now());
    return createDataResult(data, "yahoo", { requestedAt, warnings: extraWarnings });
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
    const cached = globalDataCache.read<InstrumentSearchResult[]>("search", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "yahoo", {
        requestedAt,
        stale: false,
        asOf: cached.asOf,
        warnings: [],
      });
    }
    const data = await this.yahoo.searchInstruments(trimmed, limit);
    globalDataCache.write("search", cacheKey, data, cacheTtlMs("search"), Date.now());
    return createDataResult(data, "yahoo", { requestedAt });
  }

  private async fetchProviderCandles(
    providerName: "tws" | "ibkr",
    provider: TwsProvider | IbkrProvider,
    request: CandleRequest,
    requestedAt: number,
    bypassLegacyCache = false,
    twsConnectionId?: string,
  ): Promise<DataResult<CandleResponse> | null> {
    const cacheKey = this.candlesCacheKey(
      providerName,
      request,
      providerName === "tws" ? twsConnectionId : undefined,
    );
    if (!bypassLegacyCache) {
      const cached = globalDataCache.read<CandleResponse>("candles", cacheKey);
      if (cached.hit && cached.value) {
        return createDataResult(cached.value, providerName, {
          requestedAt,
          asOf: cached.asOf,
        });
      }
    }
    const twsOptions =
      providerName === "tws" && twsConnectionId ? { connectionId: twsConnectionId } : undefined;
    const data =
      providerName === "tws"
        ? await (provider as TwsProvider).getCandles(request, twsOptions)
        : await provider.getCandles(request);
    if (data && data.candles.length > 0) {
      globalDataCache.write(
        "candles",
        cacheKey,
        data,
        cacheTtlMs("candles", request.interval),
        Date.now(),
      );
      return createDataResult(data, providerName, { requestedAt });
    }
    return null;
  }

  async getCandles(
    request: CandleRequest,
    options: MarketDataReadOptions = {},
  ): Promise<DataResult<CandleResponse>> {
    const perf = isMarketDataPerfEnabled() ? new PerfPhaseCollector() : null;
    const key = hotCandlesKey(request);
    const hotStart = Date.now();
    const hot = globalHotStore.read<CandleResponse>(key);
    perf?.record("cache.hot.read", hotStart, true, "cache", {
      hit: hot.hit,
      fresh: hot.fresh,
      servable: hot.servable,
      source: hot.source,
    });
    const skipHotYahoo =
      hot.source === "yahoo" && (this.tws.isConfigured() || this.ibkr.isConfigured());
    if (hot.hit && hot.data && hot.servable && !skipHotYahoo) {
      if (!hot.fresh) {
        this.scheduleCandlesRevalidate(request, key, options.twsConnectionId);
      }
      return attachPerfMeta(
        createDataResult(hot.data, hot.source ?? "mixed", {
          requestedAt: Date.now(),
          asOf: hot.asOf,
          stale: !hot.fresh,
          warnings: hot.warnings ?? [],
          cacheTier: hotCacheTier(hot.fresh),
        }),
        options.traceId,
        perf,
      );
    }
    const freshStart = Date.now();
    const result = await this.fetchCandlesFresh(request, {
      perf,
      twsConnectionId: options.twsConnectionId,
    });
    perf?.record("service.fetchCandlesFresh", freshStart, true, "service", {
      source: result.source,
      cacheTier: result.cacheTier ?? "cold",
      barCount: result.data.candles.length,
    });
    writeHotCandles(request, result.data, result.source, result.warnings);
    return attachPerfMeta(
      { ...result, cacheTier: result.cacheTier ?? "cold" },
      options.traceId,
      perf,
    );
  }

  private scheduleCandlesRevalidate(
    request: CandleRequest,
    key: string,
    twsConnectionId?: string,
  ): void {
    if (this.candlesRevalidateKeys.has(key)) return;
    this.candlesRevalidateKeys.add(key);
    void this.fetchCandlesFresh(request, { bypassLegacyCache: true, twsConnectionId })
      .then((result) => {
        writeHotCandles(request, result.data, result.source, result.warnings);
      })
      .catch(() => {})
      .finally(() => {
        this.candlesRevalidateKeys.delete(key);
      });
  }

  private async fetchCandlesFresh(
    request: CandleRequest,
    options: {
      bypassLegacyCache?: boolean;
      perf?: PerfPhaseCollector | null;
      twsConnectionId?: string;
    } = {},
  ): Promise<DataResult<CandleResponse>> {
    const requestedAt = Date.now();
    const providerWarnings: string[] = [];
    const perf = options.perf ?? null;

    await this.ensureTwsGatewayProbe();
    const twsDecision = this.twsRoutingDecision("candles");
    if (twsDecision.shouldTry) {
      const twsStart = Date.now();
      try {
        const twsResult = await this.fetchProviderCandles(
          "tws",
          this.tws,
          request,
          requestedAt,
          options.bypassLegacyCache,
          options.twsConnectionId,
        );
        if (twsResult) {
          perf?.record("provider.tws.candles", twsStart, true, "provider", {
            source: "tws",
            barCount: twsResult.data.candles.length,
          });
          this.recordTwsSuccess(request.symbol);
          return twsResult;
        }
        perf?.record("provider.tws.candles", twsStart, false, "provider", {
          reason: "empty",
        });
        providerWarnings.push("TWS returned no candles; trying next provider");
      } catch (error) {
        perf?.record("provider.tws.candles", twsStart, false, "provider", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.recordTwsFailure(error);
        providerWarnings.push(
          error instanceof Error
            ? `TWS candles failed: ${error.message}; trying next provider`
            : "TWS candles failed; trying next provider",
        );
      }
    } else if (twsDecision.warning) {
      perf?.push({
        name: "provider.tws.skipped",
        ms: 0,
        ok: false,
        layer: "provider",
        detail: { reason: twsDecision.warning },
      });
      providerWarnings.push(twsDecision.warning);
    }

    if (this.ibkr.isConfigured()) {
      await this.ensureIbkrAuthProbe();
      const ibkrDecision = this.ibkrRoutingDecision("candles");
      if (ibkrDecision.shouldTry) {
        const ibkrStart = Date.now();
        try {
          const ibkrResult = await this.fetchProviderCandles(
            "ibkr",
            this.ibkr,
            request,
            requestedAt,
            options.bypassLegacyCache,
          );
          if (ibkrResult) {
            perf?.record("provider.ibkr.candles", ibkrStart, true, "provider", {
              source: "ibkr",
              barCount: ibkrResult.data.candles.length,
            });
            this.recordIbkrSuccess();
            return createDataResult(ibkrResult.data, ibkrResult.source, {
              requestedAt,
              warnings: providerWarnings,
              phases: ibkrResult.phases,
            });
          }
          perf?.record("provider.ibkr.candles", ibkrStart, false, "provider", {
            reason: "empty",
          });
          providerWarnings.push(
            "IBKR returned no candles; falling back to Yahoo",
          );
        } catch (error) {
          perf?.record("provider.ibkr.candles", ibkrStart, false, "provider", {
            error: error instanceof Error ? error.message : String(error),
          });
          this.recordIbkrFailure(error);
          providerWarnings.push(
            error instanceof Error
              ? `IBKR candles failed: ${error.message}; falling back to Yahoo`
              : "IBKR candles failed; falling back to Yahoo",
          );
        }
      } else if (ibkrDecision.warning) {
        perf?.push({
          name: "provider.ibkr.skipped",
          ms: 0,
          ok: false,
          layer: "provider",
          detail: { reason: ibkrDecision.warning },
        });
        providerWarnings.push(ibkrDecision.warning);
      }

      const yahooStart = Date.now();
      const yahooResult = await this.fetchYahooCandles(request, requestedAt);
      perf?.record("provider.yahoo.candles", yahooStart, true, "provider", {
        source: "yahoo",
        barCount: yahooResult.data.candles.length,
        stale: yahooResult.stale,
      });
      return createDataResult(yahooResult.data, yahooResult.source, {
        requestedAt,
        asOf: yahooResult.asOf,
        stale: yahooResult.stale,
        warnings: [...providerWarnings, ...yahooResult.warnings],
      });
    }

    if (providerWarnings.length > 0) {
      const yahooStart = Date.now();
      const yahooResult = await this.fetchYahooCandles(request, requestedAt);
      perf?.record("provider.yahoo.candles", yahooStart, true, "provider", {
        source: "yahoo",
        barCount: yahooResult.data.candles.length,
        stale: yahooResult.stale,
      });
      return createDataResult(yahooResult.data, yahooResult.source, {
        requestedAt,
        asOf: yahooResult.asOf,
        stale: yahooResult.stale,
        warnings: [...providerWarnings, ...yahooResult.warnings],
      });
    }

    const yahooStart = Date.now();
    const yahooOnly = await this.fetchYahooCandles(request, requestedAt);
    perf?.record("provider.yahoo.candles", yahooStart, true, "provider", {
      source: "yahoo",
      barCount: yahooOnly.data.candles.length,
      stale: yahooOnly.stale,
    });
    return yahooOnly;
  }

  /** Legacy API shape for /api/candles and chart fetchers. */
  async getLegacyCandles(
    request: CandleRequest,
    options: MarketDataReadOptions = {},
  ): Promise<
    DataResult<Array<ReturnType<typeof equityCandleToLegacyApi>>>
  > {
    const result = await this.getCandles(request, options);
    return createDataResult(
      result.data.candles.map(equityCandleToLegacyApi),
      result.source,
      {
        requestedAt: result.requestedAt,
        receivedAt: result.receivedAt,
        asOf: result.asOf,
        stale: result.stale,
        warnings: result.warnings,
        cacheTier: result.cacheTier,
        traceId: result.traceId,
        phases: result.phases,
      },
    );
  }

  private async fetchProviderQuotes(
    providerName: "tws" | "ibkr",
    provider: TwsProvider | IbkrProvider,
    normalized: string[],
    requestedAt: number,
    twsConnectionId?: string,
  ): Promise<{ quotes: EquityQuote[]; missingSymbols: string[]; source: "tws" | "ibkr" | "mixed" } | null> {
    const cacheKey = this.quotesCacheKey(
      providerName,
      normalized,
      providerName === "tws" ? twsConnectionId : undefined,
    );
    const cached = globalDataCache.read<EquityQuote[]>("quotes", cacheKey);
    if (cached.hit && cached.value) {
      return {
        quotes: cached.value,
        missingSymbols: [],
        source: providerName,
      };
    }
    const twsOptions =
      providerName === "tws" && twsConnectionId ? { connectionId: twsConnectionId } : undefined;
    const batch =
      providerName === "tws"
        ? await (provider as TwsProvider).getQuotesBatch(normalized, twsOptions)
        : await provider.getQuotesBatch(normalized);
    if (batch.quotes.length === 0 && batch.missingSymbols.length === 0) {
      return null;
    }
    const source =
      batch.missingSymbols.length > 0 && batch.quotes.length > 0
        ? ("mixed" as const)
        : providerName;
    if (batch.quotes.length > 0 && batch.missingSymbols.length === 0) {
      globalDataCache.write("quotes", cacheKey, batch.quotes, cacheTtlMs("quotes"), Date.now());
    }
    return {
      quotes: batch.quotes,
      missingSymbols: batch.missingSymbols,
      source,
    };
  }

  async getQuotes(
    symbols: string[],
    options: MarketDataReadOptions = {},
  ): Promise<DataResult<EquityQuote[]>> {
    const perf = isMarketDataPerfEnabled() ? new PerfPhaseCollector() : null;
    const requestedAt = Date.now();
    const normalized = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    if (normalized.length === 0) {
      return createDataResult([], "yahoo", { requestedAt, traceId: options.traceId });
    }

    const fromHot: EquityQuote[] = [];
    let allServable = true;
    let anyStale = false;
    let primarySource: string | null = null;
    const hotWarnings: string[] = [];
    const hotStart = Date.now();
    let hotHits = 0;

    for (const sym of normalized) {
      const hot = globalHotStore.read<EquityQuote>(hotQuoteKey(sym));
      const skipHotYahoo =
        hot.source === "yahoo" && (this.tws.isConfigured() || this.ibkr.isConfigured());
      if (hot.hit && hot.data && hot.servable && !skipHotYahoo) {
        hotHits += 1;
        fromHot.push(hot.data);
        if (!hot.fresh) anyStale = true;
        if (hot.source) {
          primarySource =
            primarySource == null
              ? hot.source
              : primarySource === hot.source
                ? hot.source
                : "mixed";
        }
        if (hot.warnings?.length) hotWarnings.push(...hot.warnings);
      } else {
        allServable = false;
      }
    }
    perf?.record("cache.hot.read", hotStart, true, "cache", {
      hit: hotHits > 0,
      hits: hotHits,
      requested: normalized.length,
      allServable,
    });

    if (allServable && fromHot.length === normalized.length) {
      if (anyStale) {
        this.scheduleQuotesRevalidate(normalized, options.twsConnectionId);
      }
      return attachPerfMeta(
        createDataResult(fromHot, primarySource ?? "yahoo", {
          requestedAt,
          asOf: oldestQuoteUpdatedAt(fromHot),
          stale: anyStale,
          warnings: hotWarnings,
          cacheTier: hotCacheTier(!anyStale),
        }),
        options.traceId,
        perf,
      );
    }

    const hotBySymbol = new Map(fromHot.map((quote) => [quote.symbol, quote]));
    const missingSymbols = normalized.filter((sym) => !hotBySymbol.has(sym));

    if (fromHot.length > 0 && missingSymbols.length > 0) {
      const freshStart = Date.now();
      const fresh = await this.fetchQuotesFresh(missingSymbols, requestedAt, perf, options);
      perf?.record("service.fetchQuotesFresh", freshStart, true, "service", {
        source: fresh.source,
        quoteCount: fresh.data.length,
        partialHot: true,
      });
      for (const quote of fresh.data) {
        writeHotQuote(quote, fresh.source, fresh.warnings);
        hotBySymbol.set(quote.symbol, quote);
      }
      const merged = normalized
        .map((sym) => hotBySymbol.get(sym))
        .filter((q): q is EquityQuote => q != null);
      const mergedSource =
        primarySource != null && fresh.source !== primarySource
          ? "mixed"
          : (primarySource ?? fresh.source);
      if (anyStale) {
        this.scheduleQuotesRevalidate(
          normalized.filter((sym) => {
            const hot = globalHotStore.read<EquityQuote>(hotQuoteKey(sym));
            return hot.hit && !hot.fresh;
          }),
          options.twsConnectionId,
        );
      }
      return attachPerfMeta(
        createDataResult(merged, mergedSource, {
          requestedAt,
          asOf: oldestQuoteUpdatedAt(merged),
          stale: anyStale,
          warnings: [...hotWarnings, ...fresh.warnings],
          cacheTier: hotCacheTier(!anyStale && fresh.cacheTier === "hot-fresh"),
        }),
        options.traceId,
        perf,
      );
    }

    const freshStart = Date.now();
    const result = await this.fetchQuotesFresh(normalized, requestedAt, perf, options);
    perf?.record("service.fetchQuotesFresh", freshStart, true, "service", {
      source: result.source,
      quoteCount: result.data.length,
    });
    for (const quote of result.data) {
      writeHotQuote(quote, result.source, result.warnings);
    }
    return attachPerfMeta(
      { ...result, cacheTier: result.cacheTier ?? "cold" },
      options.traceId,
      perf,
    );
  }

  private scheduleQuotesRevalidate(symbols: string[], twsConnectionId?: string): void {
    if (symbols.length === 0) return;
    const key = `${twsConnectionId ?? ""}|${symbols.join(",")}`;
    if (this.quotesRevalidateKey === key) return;
    this.quotesRevalidateKey = key;
    void this.fetchQuotesFresh(symbols, Date.now(), null, { twsConnectionId })
      .then((result) => {
        for (const quote of result.data) {
          writeHotQuote(quote, result.source, result.warnings);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (this.quotesRevalidateKey === key) {
          this.quotesRevalidateKey = null;
        }
      });
  }

  private async fetchQuotesFresh(
    normalized: string[],
    requestedAt: number,
    perf: PerfPhaseCollector | null = null,
    options: Pick<MarketDataReadOptions, "twsConnectionId"> = {},
  ): Promise<DataResult<EquityQuote[]>> {

    if (!this.tws.isConfigured() && !this.ibkr.isConfigured()) {
      const yahooStart = Date.now();
      const yahooOnly = await this.fetchYahooQuotes(normalized, requestedAt);
      perf?.record("provider.yahoo.quotes", yahooStart, true, "provider", {
        quoteCount: yahooOnly.data.length,
      });
      return yahooOnly;
    }

    const providerWarnings: string[] = [];
    const quoteBySymbol = new Map<string, EquityQuote>();
    let primarySource: "tws" | "ibkr" | "yahoo" | "mixed" | null = null;

    await this.ensureTwsGatewayProbe();
    const twsDecision = this.twsRoutingDecision("quotes");

    const mergeBatch = (
      batch: { quotes: EquityQuote[]; missingSymbols: string[]; source: "tws" | "ibkr" | "mixed" },
      label: string,
    ) => {
      for (const quote of batch.quotes) {
        quoteBySymbol.set(quote.symbol, quote);
      }
      if (batch.missingSymbols.length > 0) {
        providerWarnings.push(
          `${label} could not resolve: ${batch.missingSymbols.join(", ")}`,
        );
      }
      if (batch.quotes.length > 0) {
        primarySource =
          primarySource == null
            ? batch.source
            : primarySource === batch.source
              ? batch.source
              : "mixed";
      } else if (primarySource == null) {
        primarySource = batch.source;
      }
    };

    if (twsDecision.shouldTry) {
      const twsStart = Date.now();
      try {
        const twsBatch = await this.fetchProviderQuotes(
          "tws",
          this.tws,
          normalized,
          requestedAt,
          options.twsConnectionId,
        );
        if (twsBatch) {
          if (twsBatch.quotes.length > 0) {
            this.recordTwsSuccess();
          }
          perf?.record("provider.tws.quotes", twsStart, true, "provider", {
            quoteCount: twsBatch.quotes.length,
            missing: twsBatch.missingSymbols.length,
          });
          mergeBatch(twsBatch, "TWS");
        } else {
          perf?.record("provider.tws.quotes", twsStart, false, "provider", {
            reason: "empty",
          });
          providerWarnings.push("TWS returned no quotes; trying next provider");
        }
      } catch (error) {
        perf?.record("provider.tws.quotes", twsStart, false, "provider", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.recordTwsFailure(error);
        providerWarnings.push(
          error instanceof Error
            ? `TWS quotes failed: ${error.message}; trying next provider`
            : "TWS quotes failed; trying next provider",
        );
      }
    } else if (twsDecision.warning) {
      perf?.push({
        name: "provider.tws.skipped",
        ms: 0,
        ok: false,
        layer: "provider",
        detail: { reason: twsDecision.warning },
      });
      providerWarnings.push(twsDecision.warning);
    }

    const unresolved = normalized.filter((sym) => !quoteBySymbol.has(sym));
    await this.ensureIbkrAuthProbe();
    const ibkrDecision = this.ibkrRoutingDecision("quotes");
    if (unresolved.length > 0 && this.ibkr.isConfigured() && ibkrDecision.shouldTry) {
      const ibkrStart = Date.now();
      try {
        const ibkrBatch = await this.fetchProviderQuotes("ibkr", this.ibkr, unresolved, requestedAt);
        if (ibkrBatch) {
          if (ibkrBatch.quotes.length > 0) {
            this.recordIbkrSuccess();
          }
          perf?.record("provider.ibkr.quotes", ibkrStart, true, "provider", {
            quoteCount: ibkrBatch.quotes.length,
            missing: ibkrBatch.missingSymbols.length,
          });
          mergeBatch(ibkrBatch, "IBKR");
        } else {
          perf?.record("provider.ibkr.quotes", ibkrStart, false, "provider", {
            reason: "empty",
          });
          providerWarnings.push("IBKR returned no quotes for unresolved symbols");
        }
      } catch (error) {
        perf?.record("provider.ibkr.quotes", ibkrStart, false, "provider", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.recordIbkrFailure(error);
        providerWarnings.push(
          error instanceof Error
            ? `IBKR quotes failed: ${error.message}`
            : "IBKR quotes failed",
        );
      }
    } else if (unresolved.length > 0 && ibkrDecision.warning) {
      perf?.push({
        name: "provider.ibkr.skipped",
        ms: 0,
        ok: false,
        layer: "provider",
        detail: { reason: ibkrDecision.warning },
      });
      providerWarnings.push(ibkrDecision.warning);
    }

    const stillMissing = normalized.filter((sym) => !quoteBySymbol.has(sym));
    if (stillMissing.length > 0) {
      providerWarnings.push(`Filling via Yahoo: ${stillMissing.join(", ")}`);
      const yahooStart = Date.now();
      const yahooFill = await this.yahoo.getQuotes(stillMissing);
      perf?.record("provider.yahoo.quotes", yahooStart, true, "provider", {
        quoteCount: yahooFill.length,
        fill: true,
      });
      for (const quote of yahooFill) {
        quoteBySymbol.set(quote.symbol, quote);
      }
      if (primarySource != null && primarySource !== "yahoo") {
        primarySource = "mixed";
      } else {
        primarySource = "yahoo";
      }
    }

    const merged = normalized
      .map((sym) => quoteBySymbol.get(sym))
      .filter((q): q is EquityQuote => q != null);

    if (merged.length > 0) {
      return createDataResult(merged, primarySource ?? "yahoo", {
        requestedAt,
        warnings: providerWarnings,
      });
    }

    if (this.ibkr.isConfigured() || this.tws.isConfigured()) {
      const yahooResult = await this.fetchYahooQuotes(normalized, requestedAt, providerWarnings);
      return createDataResult(yahooResult.data, yahooResult.source, {
        requestedAt,
        asOf: yahooResult.asOf,
        stale: yahooResult.stale,
        warnings: yahooResult.warnings,
      });
    }

    return this.fetchYahooQuotes(normalized, requestedAt);
  }

  async getWatchlistQuotes(
    symbols: string[],
    options: MarketDataReadOptions = {},
  ): Promise<DataResult<QuoteSnapshot[]>> {
    const result = await this.getQuotes(symbols, options);
    return createDataResult(
      result.data.map(equityQuoteToWatchlistQuote),
      result.source,
      {
        requestedAt: result.requestedAt,
        receivedAt: result.receivedAt,
        asOf: result.asOf,
        stale: result.stale,
        warnings: result.warnings,
        cacheTier: result.cacheTier,
        traceId: result.traceId,
        phases: result.phases,
      },
    );
  }

  async getFundamentals(symbol: string): Promise<DataResult<FundamentalsSnapshot>> {
    const requestedAt = Date.now();
    const sym = symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey(["fundamentals", sym]);
    const cached = globalDataCache.read<FundamentalsSnapshot>("fundamentals", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "yahoo", { requestedAt, asOf: cached.asOf });
    }
    const data = await this.yahoo.getFundamentals(sym);
    globalDataCache.write("fundamentals", cacheKey, data, cacheTtlMs("fundamentals"), Date.now());
    return createDataResult(data, "yahoo", { requestedAt });
  }

  async getWatchlistFundamentals(
    symbol: string,
  ): Promise<DataResult<WatchlistFundamentals>> {
    const result = await this.getFundamentals(symbol);
    return createDataResult(fundamentalsToWatchlist(result.data), result.source, {
      requestedAt: result.requestedAt,
      receivedAt: result.receivedAt,
      asOf: result.asOf,
      stale: result.stale,
      warnings: result.warnings,
    });
  }

  async getMarketContext(symbol: string): Promise<DataResult<MarketContext>> {
    const requestedAt = Date.now();
    const sym = symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey(["market-context", sym]);
    const cached = globalDataCache.read<MarketContext>("market_context", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "mixed", {
        requestedAt,
        asOf: cached.asOf,
      });
    }

    const warnings: string[] = [];
    let source: DataResult<MarketContext>["source"] = "mixed";
    let twsDetails = null as Awaited<ReturnType<TwsProvider["getContractDetails"]>>;
    let ibkrInfo = null as Awaited<ReturnType<IbkrProvider["getContractClassification"]>>;

    if (this.tws.isConfigured()) {
      const twsDecision = this.twsRoutingDecision("quotes");
      if (twsDecision.shouldTry) {
        try {
          twsDetails = await this.tws.getContractDetails(sym);
          if (twsDetails) {
            source = "tws";
            this.recordTwsSuccess();
          }
        } catch (error) {
          this.recordTwsFailure(error);
          warnings.push(
            error instanceof Error ? error.message : "TWS contract details unavailable",
          );
        }
      } else if (twsDecision.warning) {
        warnings.push(twsDecision.warning);
      }
    }

    if (!twsDetails?.category && !twsDetails?.industry && this.ibkr.isConfigured()) {
      const ibkrDecision = this.ibkrRoutingDecision("quotes");
      if (ibkrDecision.shouldTry) {
        try {
          ibkrInfo = await this.ibkr.getContractClassification(sym);
          if (ibkrInfo) {
            source = source === "tws" ? "mixed" : "ibkr";
            this.recordIbkrSuccess();
          }
        } catch (error) {
          this.recordIbkrFailure(error);
          warnings.push(
            error instanceof Error ? error.message : "IBKR contract classification unavailable",
          );
        }
      } else if (ibkrDecision.warning) {
        warnings.push(ibkrDecision.warning);
      }
    }

    const needsFallback =
      !twsDetails?.category &&
      !twsDetails?.industry &&
      !twsDetails?.subcategory &&
      !ibkrInfo?.category &&
      !ibkrInfo?.industry &&
      !ibkrInfo?.subcategory;

    let fmpProfile = null as FmpCompanyProfile | null;
    let fundamentals = null as FundamentalsSnapshot | null;

    if (needsFallback) {
      const fmpResult = await this.getFmpCompanyProfile(sym);
      fmpProfile = fmpResult.data;
      warnings.push(...(fmpResult.warnings ?? []));
      if (fmpProfile?.sector || fmpProfile?.industry) {
        source = source === "mixed" ? "fmp" : "mixed";
      }

      if (!fmpProfile?.sector && !fmpProfile?.industry) {
        const yahooResult = await this.getFundamentals(sym);
        fundamentals = yahooResult.data;
        if (fundamentals.sector || fundamentals.industry) {
          source = source === "mixed" ? "yahoo" : "mixed";
        }
      }
    }

    const context = buildMarketContext({
      symbol: sym,
      twsDetails,
      ibkrInfo,
      fmpProfile,
      fundamentals,
      warnings,
    });

    globalDataCache.write(
      "market_context",
      cacheKey,
      context,
      cacheTtlMs("market_context"),
      Date.now(),
    );

    return createDataResult(context, source, {
      requestedAt,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  }

  async getSecCompanyFacts(symbol: string): Promise<DataResult<SecCompanyFacts | null>> {
    const requestedAt = Date.now();
    if (!this.sec.isConfigured()) {
      return createDataResult(null, "sec", {
        requestedAt,
        warnings: ["SEC provider unavailable"],
      });
    }
    const sym = symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey(["sec-facts", sym]);
    const cached = globalDataCache.read<SecCompanyFacts | null>("sec", cacheKey);
    if (cached.hit) {
      return createDataResult(cached.value, "sec", { requestedAt, asOf: cached.asOf });
    }
    const data = await this.sec.getCompanyFacts(sym);
    globalDataCache.write("sec", cacheKey, data, cacheTtlMs("sec"), Date.now());
    return createDataResult(data, "sec", { requestedAt });
  }

  async getSecFilings(symbol: string, limit = 10): Promise<DataResult<SecFiling[]>> {
    const requestedAt = Date.now();
    const sym = symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey(["sec-filings", sym, limit]);
    const cached = globalDataCache.read<SecFiling[]>("sec", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "sec", { requestedAt, asOf: cached.asOf });
    }
    const data = await this.sec.getRecentFilings(sym, limit);
    globalDataCache.write("sec", cacheKey, data, cacheTtlMs("sec"), Date.now());
    return createDataResult(data, "sec", { requestedAt });
  }

  async getMacroSeries(
    seriesId: string,
    limit = 120,
  ): Promise<DataResult<MacroSeries | null>> {
    const requestedAt = Date.now();
    if (!this.fred.isConfigured()) {
      return createDataResult(null, "fred", {
        requestedAt,
        warnings: ["FRED_API_KEY is not configured"],
      });
    }
    const cacheKey = buildCacheKey(["macro", seriesId, limit]);
    const cached = globalDataCache.read<MacroSeries | null>("macro", cacheKey);
    if (cached.hit) {
      return createDataResult(cached.value, "fred", { requestedAt, asOf: cached.asOf });
    }
    const data = await this.fred.getSeries(seriesId, limit);
    globalDataCache.write("macro", cacheKey, data, cacheTtlMs("macro"), Date.now());
    return createDataResult(data, "fred", { requestedAt });
  }

  async getMacroReleases(limit = 20): Promise<DataResult<EconomicRelease[]>> {
    const requestedAt = Date.now();
    if (!this.fred.isConfigured()) {
      return createDataResult([], "fred", {
        requestedAt,
        warnings: ["FRED_API_KEY is not configured"],
      });
    }
    const cacheKey = buildCacheKey(["macro-releases", limit]);
    const cached = globalDataCache.read<EconomicRelease[]>("macro", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fred", { requestedAt, asOf: cached.asOf });
    }
    const data = await this.fred.getReleases(limit);
    globalDataCache.write("macro", cacheKey, data, cacheTtlMs("macro"), Date.now());
    return createDataResult(data, "fred", { requestedAt });
  }

  async getMarketEvents(
    query: MarketEventsQuery,
  ): Promise<DataResult<MarketEvent[]>> {
    const requestedAt = Date.now();
    const families = defaultFamiliesForQuery(query);
    const includeCorporate = families.includes("corporate");
    const includeFiling = families.includes("filing");
    const includeMacro = families.includes("macro") && query.includeMacro === true;

    const warnings: string[] = [];
    const rawEvents: MarketEvent[] = [];
    const symbol = query.symbol?.trim().toUpperCase();

    const cacheKey = buildCacheKey([
      "market-events",
      symbol ?? "",
      query.from ?? "",
      query.to ?? "",
      families.join(","),
      query.canonicalIds?.join(",") ?? "",
      query.importance?.join(",") ?? "",
      includeMacro ? "macro" : "",
    ]);
    const cached = globalDataCache.read<MarketEvent[]>("events", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "edge-events", {
        requestedAt,
        asOf: cached.asOf,
      });
    }

    if (symbol && includeCorporate && this.fmp.isConfigured()) {
      const fmpResult = await this.fmp.getCorporateEvents({
        symbol,
        from: query.from,
        to: query.to,
      });
      warnings.push(...fmpResult.warnings);
      rawEvents.push(...fmpResult.events.map(normalizeFmpCorporateEvent));
    } else if (symbol && includeCorporate && !this.fmp.isConfigured()) {
      warnings.push("FMP_API_KEY is not configured — corporate events unavailable");
    }

    if (symbol && includeFiling) {
      if (this.sec.isConfigured()) {
        try {
          const secFilings = await this.sec.getRecentFilings(symbol, 20);
          rawEvents.push(...secFilings.map(normalizeSecFiling));
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `SEC filings failed: ${error.message}`
              : "SEC filings failed",
          );
        }
      }

      if (this.fmp.isConfigured()) {
        const filingWindow = defaultFmpSecFilingDateWindow({
          from: query.from,
          to: query.to,
        });
        try {
          const fmpFilings = await this.fmp.getSecFilings({
            symbol,
            from: filingWindow.from,
            to: filingWindow.to,
            limit: 20,
          });
          warnings.push(...fmpFilings.warnings);
          for (const filing of fmpFilings.filings) {
            rawEvents.push(
              normalizeFmpSecFiling({
                symbol: filing.symbol,
                formType: filing.formType,
                filingDate: filing.filingDate,
                url: filing.url,
                cik: filing.cik,
                acceptedDate: filing.acceptedDate,
              }),
            );
          }
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `FMP SEC filings failed: ${error.message}`
              : "FMP SEC filings failed",
          );
        }
      }
    }

    if (includeMacro) {
      let hasFullMacroFromFmp = false;
      const fmpMacroIds = new Set<string>();

      if (this.fmp.isConfigured()) {
        const { from, to } = defaultMacroDateWindow(query);
        try {
          const calendar = await this.fmp.getEconomicCalendar({ from, to });
          warnings.push(...calendar.warnings);
          const fmpMacroEvents = normalizeFmpEconomicCalendarEvents(
            calendar.events.filter((row) => row.country === "US"),
          );
          rawEvents.push(...fmpMacroEvents);
          hasFullMacroFromFmp = fmpMacroEvents.some(
            (event) => event.coverageLevel === "full",
          );
          for (const event of fmpMacroEvents) {
            fmpMacroIds.add(event.canonicalId);
          }
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `FMP economic calendar failed: ${error.message}`
              : "FMP economic calendar failed",
          );
        }
      } else {
        warnings.push("FMP_API_KEY is not configured — macro calendar unavailable");
      }

      const missingPriorityIds = PRIORITY_ONE_MACRO_IDS.filter(
        (id) => !fmpMacroIds.has(id),
      );
      const shouldFetchFred =
        missingPriorityIds.length > 0 || !hasFullMacroFromFmp;

      if (shouldFetchFred && this.fred.isConfigured()) {
        try {
          const releases = await this.fred.getReleases(100);
          rawEvents.push(...normalizeFredReleases(releases));
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `FRED macro releases failed: ${error.message}`
              : "FRED macro releases failed",
          );
        }
      } else if (shouldFetchFred && !this.fred.isConfigured() && !this.fmp.isConfigured()) {
        warnings.push("FRED_API_KEY is not configured — macro events unavailable");
      }

      if (!hasFullMacroFromFmp) {
        warnings.push(
          "Macro event cards are partial via FRED fallback; FMP economic calendar unavailable or restricted",
        );
      }
    }

    const deduped = dedupeMarketEvents(rawEvents);
    const filtered = filterMarketEvents(deduped, { ...query, families });

    globalDataCache.write("events", cacheKey, filtered, cacheTtlMs("events"), Date.now());

    const sources = [...new Set(filtered.map((e) => e.source))];
    const sourceLabel = sources.length === 1 ? sources[0]! : sources.length > 1 ? "edge-events" : "none";

    return createDataResult(filtered, sourceLabel, { requestedAt, warnings });
  }

  async getCorporateEvents(args: {
    symbol?: string;
    from?: string;
    to?: string;
  }): Promise<DataResult<CorporateEvent[]>> {
    const result = await this.getMarketEvents({
      symbol: args.symbol,
      from: args.from,
      to: args.to,
      families: ["corporate", "filing"],
      includeMacro: false,
    });
    return createDataResult(
      result.data.map(marketEventToCorporateEvent),
      result.source,
      {
        requestedAt: result.requestedAt,
        receivedAt: result.receivedAt,
        asOf: result.asOf,
        stale: result.stale,
        warnings: result.warnings,
      },
    );
  }

  async getNews(args: {
    symbol?: string;
    limit?: number;
  }): Promise<DataResult<NewsItem[]>> {
    const requestedAt = Date.now();
    if (!this.fmp.isConfigured()) {
      return createDataResult([], "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const cacheKey = buildCacheKey(["news", args.symbol ?? "all", args.limit ?? 20]);
    const cached = globalDataCache.read<NewsItem[]>("news", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getNews(args);
    globalDataCache.write("news", cacheKey, result.news, cacheTtlMs("news"), Date.now());
    return createDataResult(result.news, "fmp", {
      requestedAt,
      warnings: result.warnings,
    });
  }

  async getFmpCompanyProfile(symbol: string): Promise<DataResult<FmpCompanyProfile | null>> {
    const requestedAt = Date.now();
    if (!this.fmp.isConfigured()) {
      return createDataResult(null, "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const sym = symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey(["fmp-profile", sym]);
    const cached = globalDataCache.read<FmpCompanyProfile | null>("fmp_profile", cacheKey);
    if (cached.hit) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getCompanyProfile(sym);
    globalDataCache.write(
      "fmp_profile",
      cacheKey,
      result.profile,
      cacheTtlMs("fmp_profile"),
      Date.now(),
    );
    return createDataResult(result.profile, "fmp", {
      requestedAt,
      warnings: result.warnings,
    });
  }

  async getFmpAnalystEstimates(args: {
    symbol: string;
    period?: FmpStatementPeriod;
    limit?: number;
  }): Promise<DataResult<FmpAnalystEstimate[]>> {
    const requestedAt = Date.now();
    if (!this.fmp.isConfigured()) {
      return createDataResult([], "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const sym = args.symbol.trim().toUpperCase();
    const period = args.period ?? "annual";
    const limit = args.limit ?? 4;
    const cacheKey = buildCacheKey(["fmp-estimates", sym, period, limit]);
    const cached = globalDataCache.read<FmpAnalystEstimate[]>("fmp_estimates", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getAnalystEstimates({ symbol: sym, period, limit });
    globalDataCache.write(
      "fmp_estimates",
      cacheKey,
      result.estimates,
      cacheTtlMs("fmp_estimates"),
      Date.now(),
    );
    return createDataResult(result.estimates, "fmp", {
      requestedAt,
      warnings: result.warnings,
    });
  }

  async getFmpFinancials(args: {
    symbol: string;
    period?: FmpStatementPeriod;
    limit?: number;
  }): Promise<DataResult<FmpFinancialsBundle>> {
    const requestedAt = Date.now();
    const sym = args.symbol.trim().toUpperCase();
    const period = args.period ?? "annual";
    const limit = args.limit ?? 4;
    if (!this.fmp.isConfigured()) {
      return createDataResult(
        {
          symbol: sym,
          period,
          incomeStatements: [],
          balanceSheets: [],
          cashFlowStatements: [],
          keyMetrics: [],
          ratios: [],
          enterpriseValues: [],
        },
        "fmp",
        { requestedAt, warnings: ["FMP_API_KEY is not configured"] },
      );
    }
    const cacheKey = buildCacheKey(["fmp-financials", sym, period, limit]);
    const cached = globalDataCache.read<FmpFinancialsBundle>("fmp_financials", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getFinancialsBundle({ symbol: sym, period, limit });
    globalDataCache.write(
      "fmp_financials",
      cacheKey,
      result.bundle,
      cacheTtlMs("fmp_financials"),
      Date.now(),
    );
    return createDataResult(result.bundle, "fmp", {
      requestedAt,
      warnings: result.warnings,
    });
  }

  async getFmpExecutives(symbol: string): Promise<DataResult<FmpExecutive[]>> {
    const requestedAt = Date.now();
    if (!this.fmp.isConfigured()) {
      return createDataResult([], "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const sym = symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey(["fmp-executives", sym]);
    const cached = globalDataCache.read<FmpExecutive[]>("fmp_executives", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getExecutives(sym);
    globalDataCache.write(
      "fmp_executives",
      cacheKey,
      result.executives,
      cacheTtlMs("fmp_executives"),
      Date.now(),
    );
    return createDataResult(result.executives, "fmp", {
      requestedAt,
      warnings: result.warnings,
    });
  }

  async getFmpSecFilings(args: {
    symbol: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<DataResult<FmpSecFiling[]>> {
    const requestedAt = Date.now();
    if (!this.fmp.isConfigured()) {
      return createDataResult([], "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const sym = args.symbol.trim().toUpperCase();
    const cacheKey = buildCacheKey([
      "fmp-filings",
      sym,
      args.from ?? "",
      args.to ?? "",
      args.limit ?? 10,
    ]);
    const cached = globalDataCache.read<FmpSecFiling[]>("fmp_filings", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getSecFilings(args);
    globalDataCache.write(
      "fmp_filings",
      cacheKey,
      result.filings,
      cacheTtlMs("fmp_filings"),
      Date.now(),
    );
    return createDataResult(result.filings, "fmp", {
      requestedAt,
      warnings: result.warnings,
    });
  }

  async getFmpMarketMovers(args: {
    kind?: FmpMarketMoverKind;
    limit?: number;
  }): Promise<DataResult<FmpMarketMover[]>> {
    const requestedAt = Date.now();
    if (!this.fmp.isConfigured()) {
      return createDataResult([], "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const kind = args.kind ?? "gainers";
    const limit = args.limit ?? 10;
    const cacheKey = buildCacheKey(["fmp-movers", kind, limit]);
    const cached = globalDataCache.read<FmpMarketMover[]>("fmp_movers", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
    }
    const result = await this.fmp.getMarketMovers({ kind, limit });
    let movers = result.movers;
    const warnings = [...result.warnings];
    try {
      const descriptorResult = await fetchUniverseDescriptors(this.fmp);
      if (descriptorResult.rows.length > 0) {
        movers = enrichMoversWithDescriptors(
          movers,
          buildDescriptorMap(descriptorResult.rows),
        );
      } else if (descriptorResult.warnings.length > 0) {
        warnings.push(...descriptorResult.warnings);
      }
    } catch {
      warnings.push("Mover descriptor enrichment failed; fundamentals unavailable");
    }
    globalDataCache.write(
      "fmp_movers",
      cacheKey,
      movers,
      cacheTtlMs("fmp_movers"),
      Date.now(),
    );
    return createDataResult(movers, "fmp", {
      requestedAt,
      warnings,
    });
  }

  async getScreenerResults(
    query: ScreenQuery,
    options: MarketDataReadOptions = {},
  ): Promise<DataResult<FmpScreenerRow[]>> {
    const requestedAt = Date.now();
    const totalStart = Date.now();
    const { traceId, perf = null } = options;
    if (!this.fmp.isConfigured()) {
      return createDataResult([], "fmp", {
        requestedAt,
        warnings: ["FMP_API_KEY is not configured"],
      });
    }
    const cacheKey = buildCacheKey(["screener", JSON.stringify(query)]);
    type ScreenerCachePayload = {
      rows: FmpScreenerRow[];
      indicatorValues?: Record<string, Record<string, number>>;
    };
    const cached = globalDataCache.read<ScreenerCachePayload>("screener", cacheKey);
    if (cached.hit && cached.value) {
      const cachedResult = createDataResult(cached.value.rows, "fmp", {
        requestedAt,
        asOf: cached.asOf,
        indicatorValues: cached.value.indicatorValues,
        traceId,
      });
      perf?.record("screener.total", totalStart, true, "service", {
        rows: cached.value.rows.length,
        hadTechnical: query.technical != null,
        cacheHit: true,
        traceId,
      });
      return attachPerfMeta(cachedResult, traceId, perf);
    }

    let rows: FmpScreenerRow[];
    let warnings: string[] = [];
    let phases: MarketDataPerfPhase[] | undefined;
    let indicatorValues: Record<string, Record<string, number>> | undefined;
    let skippedSymbols: string[] = [];
    let prefilterMs = 0;
    let prefilterCount = 0;

    if (query.technical && this.massive.isConfigured()) {
      const warmStart = Date.now();
      const { store, warnings: warmWarnings } = await ensureScreenerUniverseWarm({
        massive: this.massive,
        perf,
        traceId,
      });
      warnings.push(...warmWarnings);

      const descriptorStart = Date.now();
      const descriptorResult = await fetchUniverseDescriptors(this.fmp);
      warnings.push(...descriptorResult.warnings);
      prefilterCount = descriptorResult.rows.length;
      prefilterMs = Date.now() - descriptorStart;
      perf?.record("screener.universe.descriptors", descriptorStart, true, "provider", {
        descriptors: descriptorResult.rows.length,
        traceId,
      });

      const filtered = applyDescriptiveFilters(descriptorResult.rows, query);
      prefilterCount = filtered.length;

      const minBars = minCandlesForTechnicalRule(query.technical);
      const technical = await runTechnicalFilter(
        filtered,
        query.technical,
        async (symbol) => {
          const fromStore = getCandlesFromUniverseStore(symbol, minBars, store);
          if (fromStore.found && fromStore.candles.length >= minBars) {
            return {
              candles: fromStore.candles,
              source: "massive-universe",
              cacheTier: "universe" as const,
            };
          }
          if (fromStore.found && fromStore.candles.length > 0) {
            return {
              candles: fromStore.candles,
              source: "massive-universe",
              cacheTier: "universe" as const,
            };
          }
          const range = rangeForTechnicalRule(query.technical!);
          const agg = await this.massive.getAggregates({
            ticker: symbol,
            multiplier: 1,
            timespan: "day",
            from: range === "1y" ? recentIsoDate(-400) : recentIsoDate(-120),
            to: latestCompletedTradingDate(),
            adjusted: true,
          });
          if (agg.candles.length > 0) {
            return {
              candles: agg.candles,
              source: "massive",
              cacheTier: "cold" as const,
            };
          }
          const candleResult = await this.getCandles(
            { symbol, interval: "1d", range },
            { traceId },
          );
          return {
            candles: candleResult.data.candles,
            source: candleResult.source,
            cacheTier: candleResult.cacheTier,
          };
        },
        {
          perf,
          traceId,
          prefilterCount,
          prefilterMs,
          maxCandidates: Number.POSITIVE_INFINITY,
          concurrency: TECHNICAL_FILTER_UNIVERSE_CONCURRENCY,
          maxResults: query.maxResults,
        },
      );
      rows = technical.rows;
      warnings = [...warnings, ...technical.warnings];
      if (!perf) {
        phases = technical.phaseMeta.phases;
      }
      indicatorValues = technical.indicatorValues;
      skippedSymbols = [...skippedSymbols, ...technical.skippedSymbols];
      perf?.record("screener.universe.warm", warmStart, true, "service", {
        path: "full-universe",
        traceId,
      });
    } else {
      const prefilterStart = Date.now();
      const result = await this.fmp.runStockScreener(query);
      perf?.record("screener.prefilter", prefilterStart, true, "provider", {
        candidates: result.rows.length,
        limit: query.limit ?? 200,
        traceId,
      });
      rows = result.rows;
      warnings = [...result.warnings];
      prefilterMs = Date.now() - prefilterStart;
      prefilterCount = result.rows.length;

      if (query.technical) {
        const range = rangeForTechnicalRule(query.technical);
        const fallbackConcurrency = this.massive.isConfigured()
          ? TECHNICAL_FILTER_MASSIVE_FALLBACK_CONCURRENCY
          : TECHNICAL_FILTER_CONCURRENCY;
        const technical = await runTechnicalFilter(
          rows,
          query.technical,
          async (symbol) => {
            if (this.massive.isConfigured()) {
              const agg = await this.massive.getAggregates({
                ticker: symbol,
                multiplier: 1,
                timespan: "day",
                from: range === "1y" ? recentIsoDate(-400) : recentIsoDate(-120),
                to: latestCompletedTradingDate(),
                adjusted: true,
              });
              if (agg.candles.length > 0) {
                return {
                  candles: agg.candles,
                  source: "massive",
                  cacheTier: "cold" as const,
                };
              }
            }
            const candleResult = await this.getCandles(
              {
                symbol,
                interval: "1d",
                range,
              },
              { traceId },
            );
            return {
              candles: candleResult.data.candles,
              source: candleResult.source,
              cacheTier: candleResult.cacheTier,
            };
          },
          {
            perf,
            traceId,
            prefilterCount: result.rows.length,
            prefilterMs,
            maxCandidates: TECHNICAL_FILTER_MAX_CANDIDATES,
            concurrency: fallbackConcurrency,
            maxResults: query.maxResults,
          },
        );
        rows = technical.rows;
        warnings = [...warnings, ...technical.warnings];
        if (!perf) {
          phases = technical.phaseMeta.phases;
        }
        indicatorValues = technical.indicatorValues;
        skippedSymbols = [...skippedSymbols, ...technical.skippedSymbols];
      }
    }

    globalDataCache.write(
      "screener",
      cacheKey,
      { rows, indicatorValues },
      cacheTtlMs("screener"),
      Date.now(),
    );
    perf?.record("screener.total", totalStart, true, "service", {
      rows: rows.length,
      hadTechnical: query.technical != null,
      traceId,
    });
    const dataResult = createDataResult(rows, "fmp", {
      requestedAt,
      warnings,
      phases,
      indicatorValues,
      skippedSymbols: skippedSymbols.length > 0 ? skippedSymbols : undefined,
      traceId,
    });
    return attachPerfMeta(dataResult, traceId, perf);
  }

  async getOptionExpirations(
    underlying: string,
  ): Promise<DataResult<OptionExpiration[]>> {
    const sym = underlying.trim().toUpperCase();
    const key = hotOptionExpirationsKey(sym);
    const hot = globalHotStore.read<OptionExpiration[]>(key);
    if (hot.hit && hot.data && hot.servable) {
      if (!hot.fresh) {
        this.scheduleOptionExpirationsRevalidate(sym, key);
      }
      return createDataResult(hot.data, hot.source ?? "mixed", {
        requestedAt: Date.now(),
        asOf: hot.asOf,
        stale: !hot.fresh,
        warnings: hot.warnings ?? [],
        cacheTier: hotCacheTier(hot.fresh),
      });
    }
    const result = await this.fetchOptionExpirationsFresh(sym);
    writeHotOptionExpirations(sym, result.data, result.source, result.warnings);
    return { ...result, cacheTier: result.cacheTier ?? "cold" };
  }

  private scheduleOptionExpirationsRevalidate(underlying: string, key: string): void {
    if (this.optionExpRevalidateKeys.has(key)) return;
    this.optionExpRevalidateKeys.add(key);
    void this.fetchOptionExpirationsFresh(underlying)
      .then((result) => {
        writeHotOptionExpirations(underlying, result.data, result.source, result.warnings);
      })
      .catch(() => {})
      .finally(() => {
        this.optionExpRevalidateKeys.delete(key);
      });
  }

  private async fetchMassiveOptionExpirationsFresh(
    sym: string,
    requestedAt: number,
  ): Promise<DataResult<OptionExpiration[]> | null> {
    if (!this.massive.isConfigured()) return null;

    const cacheKey = this.optionExpirationsCacheKey("massive", sym);
    const cached = globalDataCache.read<OptionExpiration[]>("options_expirations", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "massive", {
        requestedAt,
        asOf: cached.asOf,
      });
    }

    const massiveResult = await this.massive.getOptionExpirationsWithWarnings(sym);
    globalDataCache.write(
      "options_expirations",
      cacheKey,
      massiveResult.expirations,
      cacheTtlMs("options_expirations"),
      Date.now(),
    );
    return createDataResult(massiveResult.expirations, "massive", {
      requestedAt,
      warnings: massiveResult.warnings,
    });
  }

  private async fetchMassiveOptionsChainFresh(
    request: OptionsChainRequest,
    requestedAt: number,
  ): Promise<DataResult<OptionsChainResponse> | null> {
    if (!this.massive.isConfigured()) return null;

    const underlying = request.underlying.trim().toUpperCase();
    const expiration = request.expiration ?? "";
    const strikeWindow = request.strikeWindow ?? { mode: "atm" as const, count: 20 };

    const cacheKey = this.optionsChainCacheKey("massive", underlying, expiration, strikeWindow);
    const cached = globalDataCache.read<OptionsChainResponse>("options_chain", cacheKey);
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "massive", {
        requestedAt,
        asOf: cached.asOf,
      });
    }

    const massiveResult = await this.massive.getOptionsChainWithWarnings({
      underlying,
      expiration,
      strikeWindow,
    });
    globalDataCache.write(
      "options_chain",
      cacheKey,
      massiveResult.chain,
      cacheTtlMs("options_chain"),
      Date.now(),
    );
    return createDataResult(massiveResult.chain, "massive", {
      requestedAt,
      warnings: massiveResult.warnings,
    });
  }

  private async fetchOptionExpirationsFresh(
    sym: string,
  ): Promise<DataResult<OptionExpiration[]>> {
    const requestedAt = Date.now();
    const massiveResult = await this.fetchMassiveOptionExpirationsFresh(sym, requestedAt);
    if (massiveResult) return massiveResult;

    const warnings: string[] = [];

    if (this.tws.isConfigured()) {
      const twsDecision = this.twsRoutingDecision("options");
      if (twsDecision.shouldTry) {
        const twsCacheKey = this.optionExpirationsCacheKey("tws", sym);
        const twsCached = globalDataCache.read<OptionExpiration[]>(
          "options_expirations",
          twsCacheKey,
        );
        if (twsCached.hit && twsCached.value) {
          return createDataResult(twsCached.value, "tws", {
            requestedAt,
            asOf: twsCached.asOf,
          });
        }
        try {
          const twsResult = await this.tws.getOptionExpirationsWithWarnings(sym);
          if (twsResult && twsResult.expirations.length > 0) {
            this.recordTwsSuccess(sym);
            globalDataCache.write(
              "options_expirations",
              twsCacheKey,
              twsResult.expirations,
              cacheTtlMs("options_expirations"),
              Date.now(),
            );
            return createDataResult(twsResult.expirations, "tws", {
              requestedAt,
              warnings: twsResult.warnings,
            });
          }
          if (twsResult?.warnings.length) {
            warnings.push(...twsResult.warnings);
          }
          warnings.push("TWS returned no option expirations; trying IBKR");
        } catch (error) {
          this.recordTwsFailure(error);
          warnings.push(
            error instanceof Error
              ? `TWS option expirations failed: ${error.message}; trying IBKR`
              : "TWS option expirations failed; trying IBKR",
          );
        }
      } else if (twsDecision.warning) {
        warnings.push(twsDecision.warning);
        warnings.push("TWS skipped for option expirations; trying IBKR");
      }
    }

    if (this.ibkr.isConfigured()) {
      const ibkrCacheKey = this.optionExpirationsCacheKey("ibkr", sym);
      const ibkrCached = globalDataCache.read<OptionExpiration[]>(
        "options_expirations",
        ibkrCacheKey,
      );
      if (ibkrCached.hit && ibkrCached.value) {
        return createDataResult(ibkrCached.value, "ibkr", {
          requestedAt,
          asOf: ibkrCached.asOf,
          warnings,
        });
      }

      try {
        const ibkrResult = await this.ibkr.getOptionExpirationsWithWarnings(sym);
        if (ibkrResult && ibkrResult.expirations.length > 0) {
          globalDataCache.write(
            "options_expirations",
            ibkrCacheKey,
            ibkrResult.expirations,
            cacheTtlMs("options_expirations"),
            Date.now(),
          );
          return createDataResult(ibkrResult.expirations, "ibkr", {
            requestedAt,
            warnings: [...warnings, ...ibkrResult.warnings],
          });
        }
        if (ibkrResult) {
          const detail =
            ibkrResult.warnings.find((w) => w.includes("could not resolve")) ??
            ibkrResult.warnings[0] ??
            "IBKR returned no option expirations";
          throw new Error(detail);
        }
        throw new Error("IBKR option expirations failed");
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("IBKR option expirations failed");
      }
    }

    throw new Error("TWS/IBKR not configured for options expirations");
  }

  async getOptionsChain(
    request: OptionsChainRequest,
  ): Promise<DataResult<OptionsChainResponse>> {
    const underlying = request.underlying.trim().toUpperCase();
    const expiration = request.expiration ?? "";
    const strikeWindow = request.strikeWindow ?? { mode: "atm" as const, count: 20 };
    const key = hotOptionsChainKey(underlying, expiration, strikeWindow);
    const hot = globalHotStore.read<OptionsChainResponse>(key);
    if (hot.hit && hot.data && hot.servable) {
      if (!hot.fresh) {
        this.scheduleOptionsChainRevalidate(
          { underlying, expiration, strikeWindow },
          key,
        );
      }
      return createDataResult(hot.data, hot.source ?? "mixed", {
        requestedAt: Date.now(),
        asOf: hot.asOf,
        stale: !hot.fresh,
        warnings: hot.warnings ?? [],
        cacheTier: hotCacheTier(hot.fresh),
      });
    }
    const result = await this.fetchOptionsChainFresh({
      underlying,
      expiration,
      strikeWindow,
    });
    writeHotOptionsChain(
      { underlying, expiration, strikeWindow },
      result.data,
      result.source,
      result.warnings,
    );
    return { ...result, cacheTier: result.cacheTier ?? "cold" };
  }

  private scheduleOptionsChainRevalidate(
    request: OptionsChainRequest,
    key: string,
  ): void {
    if (this.optionsChainRevalidateKeys.has(key)) return;
    this.optionsChainRevalidateKeys.add(key);
    void this.fetchOptionsChainFresh(request)
      .then((result) => {
        writeHotOptionsChain(request, result.data, result.source, result.warnings);
      })
      .catch(() => {})
      .finally(() => {
        this.optionsChainRevalidateKeys.delete(key);
      });
  }

  private async fetchOptionsChainFresh(
    request: OptionsChainRequest,
  ): Promise<DataResult<OptionsChainResponse>> {
    const requestedAt = Date.now();
    const underlying = request.underlying.trim().toUpperCase();
    const expiration = request.expiration ?? "";
    const strikeWindow = request.strikeWindow ?? { mode: "atm" as const, count: 20 };

    const massiveResult = await this.fetchMassiveOptionsChainFresh(
      { underlying, expiration, strikeWindow },
      requestedAt,
    );
    if (massiveResult) return massiveResult;

    const warnings: string[] = [];

    if (this.tws.isConfigured()) {
      const twsDecision = this.twsRoutingDecision("options");
      if (twsDecision.shouldTry) {
        const twsCacheKey = this.optionsChainCacheKey(
          "tws",
          underlying,
          expiration,
          strikeWindow,
        );
        const twsCached = globalDataCache.read<OptionsChainResponse>("options_chain", twsCacheKey);
        if (twsCached.hit && twsCached.value) {
          return createDataResult(twsCached.value, "tws", {
            requestedAt,
            asOf: twsCached.asOf,
          });
        }

        try {
          const twsResult = await this.tws.getOptionsChainWithWarnings({
            underlying,
            expiration,
            strikeWindow,
          });
          if (twsResult && twsResult.chain.contracts.length > 0) {
            this.recordTwsSuccess(underlying);
            globalDataCache.write(
              "options_chain",
              twsCacheKey,
              twsResult.chain,
              cacheTtlMs("options_chain"),
              Date.now(),
            );
            return createDataResult(twsResult.chain, "tws", {
              requestedAt,
              warnings: twsResult.warnings,
            });
          }
          if (twsResult) {
            warnings.push(
              `TWS returned no contracts for ${underlying} ${expiration}; trying IBKR`,
            );
            warnings.push(...twsResult.warnings);
          }
        } catch (error) {
          this.recordTwsFailure(error);
          warnings.push(
            error instanceof Error
              ? `TWS options chain failed: ${error.message}; trying IBKR`
              : "TWS options chain failed; trying IBKR",
          );
        }
      } else if (twsDecision.warning) {
        warnings.push(twsDecision.warning);
        warnings.push("TWS skipped for options chain; trying IBKR");
      }
    }

    if (this.ibkr.isConfigured()) {
      const ibkrCacheKey = this.optionsChainCacheKey(
        "ibkr",
        underlying,
        expiration,
        strikeWindow,
      );
      const ibkrCached = globalDataCache.read<OptionsChainResponse>("options_chain", ibkrCacheKey);
      if (ibkrCached.hit && ibkrCached.value) {
        return createDataResult(ibkrCached.value, "ibkr", {
          requestedAt,
          asOf: ibkrCached.asOf,
          warnings,
        });
      }

      try {
        const ibkrResult = await this.ibkr.getOptionsChainWithWarnings({
          underlying,
          expiration,
          strikeWindow,
        });
        if (ibkrResult && ibkrResult.chain.contracts.length > 0) {
          globalDataCache.write(
            "options_chain",
            ibkrCacheKey,
            ibkrResult.chain,
            cacheTtlMs("options_chain"),
            Date.now(),
          );
          return createDataResult(ibkrResult.chain, "ibkr", {
            requestedAt,
            warnings: [...warnings, ...ibkrResult.warnings],
          });
        }
        if (ibkrResult) {
          throw new Error(
            `IBKR returned no contracts for ${underlying} ${expiration}`,
          );
        }
        throw new Error("IBKR options chain failed");
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("IBKR options chain failed");
      }
    }

    throw new Error("TWS/IBKR not configured for options chain");
  }

  async getDerivedMetric(
    symbol: string,
    kind: DerivedMetricKind,
  ): Promise<DataResult<DerivedMetric | null>> {
    const requestedAt = Date.now();
    const sym = symbol.trim().toUpperCase();

    if (kind === "rvol") {
      const quoteResult = await this.getQuotes([sym]);
      const quote = quoteResult.data[0];
      const fundamentals = await this.getFundamentals(sym);
      const avg = fundamentals.data.averageVolume;
      const current = quote?.volume;
      if (avg == null || current == null || avg <= 0) {
        return createDataResult(null, "edge-derived", {
          requestedAt,
          warnings: ["Insufficient volume data for RVOL"],
        });
      }
      return createDataResult(
        {
          symbol: sym,
          kind,
          value: current / avg,
          asOf: Date.now(),
          source: "edge-derived",
        },
        "edge-derived",
        { requestedAt },
      );
    }

    if (kind === "gap_percent") {
      const candlesResult = await this.getCandles({
        symbol: sym,
        range: "5d",
        interval: "1d",
      });
      const candles = candlesResult.data.candles;
      if (candles.length < 2) {
        return createDataResult(null, "edge-derived", {
          requestedAt,
          warnings: ["Insufficient candle history for gap percent"],
        });
      }
      const prev = candles[candles.length - 2]!;
      const last = candles[candles.length - 1]!;
      const gap = prev.c !== 0 ? ((last.o - prev.c) / prev.c) * 100 : 0;
      return createDataResult(
        {
          symbol: sym,
          kind,
          value: gap,
          asOf: last.t,
          source: "edge-derived",
        },
        "edge-derived",
        { requestedAt },
      );
    }

    return createDataResult(null, "edge-derived", {
      requestedAt,
      warnings: [`Derived metric '${kind}' is not implemented yet`],
    });
  }

  async getIbkrStatusProbe(): Promise<DataResult<IbkrStatusProbe>> {
    const requestedAt = Date.now();
    if (!this.ibkr.isConfigured()) {
      return createDataResult(
        {
          configured: false,
          gatewayReachable: false,
          authenticated: false,
          connected: false,
          competing: false,
          warnings: ["IBKR_ENABLED is not true"],
        },
        "ibkr",
        { requestedAt, warnings: ["IBKR_ENABLED is not true"] },
      );
    }
    try {
      const data = await this.ibkr.getStatusProbe();
      return createDataResult(data, "ibkr", {
        requestedAt,
        warnings: data.warnings,
      });
    } catch (error) {
      return createDataResult(
        {
          configured: true,
          gatewayReachable: false,
          authenticated: false,
          connected: false,
          competing: false,
          warnings: [error instanceof Error ? error.message : "IBKR status probe failed"],
        },
        "ibkr",
        {
          requestedAt,
          warnings: [error instanceof Error ? error.message : "IBKR status probe failed"],
        },
      );
    }
  }

  async getIbkrContractProbe(symbol: string): Promise<DataResult<IbkrContractProbe | null>> {
    const requestedAt = Date.now();
    if (!this.ibkr.isConfigured()) {
      return createDataResult(null, "ibkr", {
        requestedAt,
        warnings: ["IBKR_ENABLED is not true"],
      });
    }
    const data = await this.ibkr.resolveContract(symbol);
    return createDataResult(data, "ibkr", { requestedAt });
  }

  async getIbkrQuoteProbe(symbol: string): Promise<DataResult<EquityQuote | null>> {
    const requestedAt = Date.now();
    if (!this.ibkr.isConfigured()) {
      return createDataResult(null, "ibkr", {
        requestedAt,
        warnings: ["IBKR_ENABLED is not true"],
      });
    }
    const data = await this.ibkr.getQuote(symbol);
    return createDataResult(data, "ibkr", { requestedAt });
  }

  async getIbkrCandlesProbe(args: {
    symbol: string;
    interval: CandleRequest["interval"];
    range: NonNullable<CandleRequest["range"]>;
  }): Promise<DataResult<CandleResponse | null>> {
    const requestedAt = Date.now();
    if (!this.ibkr.isConfigured()) {
      return createDataResult(null, "ibkr", {
        requestedAt,
        warnings: ["IBKR_ENABLED is not true"],
      });
    }
    const data = await this.ibkr.getCandlesForRange(args.symbol, args.interval, args.range);
    return createDataResult(data, "ibkr", { requestedAt });
  }

  getIbkrProvider(): IbkrProvider {
    return this.ibkr;
  }

  async getTwsStatusProbe(options: { bypassCircuit?: boolean } = {}): Promise<DataResult<TwsStatusProbe>> {
    const requestedAt = Date.now();
    if (!this.tws.isConfigured()) {
      return createDataResult(
        {
          configured: false,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["TWS_ENABLED is not true"],
        },
        "tws",
        { requestedAt, warnings: ["TWS_ENABLED is not true"] },
      );
    }
    const bypassCircuit = options.bypassCircuit === true;
    if (!bypassCircuit && !twsHealthGate.shouldTryTws("status")) {
      const gate = twsHealthGate.snapshot();
      const lastFailure = gate.lastFailure ?? "provider_error";
      const sidecarReachable = lastFailure !== "sidecar_unreachable";
      const skipReason = twsHealthGate.getSkipReason() ?? "TWS circuit open";
      return createDataResult(
        {
          configured: true,
          sidecarReachable,
          gatewayConnected: false,
          warnings: [skipReason],
        },
        "tws",
        { requestedAt, warnings: [skipReason] },
      );
    }
    const status = await this.tws.probeStatus?.(2_000);
    if (!status?.sidecarReachable) {
      return createDataResult(
        {
          configured: true,
          sidecarReachable: false,
          gatewayConnected: false,
          warnings: ["Sidecar unreachable"],
        },
        "tws",
        { requestedAt, warnings: ["Sidecar unreachable"] },
      );
    }
    return createDataResult(status, "tws", {
      requestedAt,
      warnings: status.warnings,
    });
  }

  async getTwsContractProbe(symbol: string): Promise<DataResult<TwsContractProbe | null>> {
    const requestedAt = Date.now();
    if (!this.tws.isConfigured()) {
      return createDataResult(null, "tws", {
        requestedAt,
        warnings: ["TWS_ENABLED is not true"],
      });
    }
    const data = await this.tws.resolveContract(symbol);
    return createDataResult(data, "tws", { requestedAt });
  }

  async getTwsQuoteProbe(symbol: string): Promise<DataResult<EquityQuote | null>> {
    const requestedAt = Date.now();
    if (!this.tws.isConfigured()) {
      return createDataResult(null, "tws", {
        requestedAt,
        warnings: ["TWS_ENABLED is not true"],
      });
    }
    const data = await this.tws.getQuote(symbol);
    return createDataResult(data, "tws", { requestedAt });
  }

  async getTwsCandlesProbe(args: {
    symbol: string;
    interval: CandleRequest["interval"];
    range: NonNullable<CandleRequest["range"]>;
  }): Promise<DataResult<CandleResponse | null>> {
    const requestedAt = Date.now();
    if (!this.tws.isConfigured()) {
      return createDataResult(null, "tws", {
        requestedAt,
        warnings: ["TWS_ENABLED is not true"],
      });
    }
    const data = await this.tws.getCandlesForRange(args.symbol, args.interval, args.range);
    return createDataResult(data, "tws", { requestedAt });
  }

  getTwsProvider(): TwsProvider {
    return this.tws;
  }

  /** Select quote stream transport using the same TWS health gate as REST quotes. */
  async resolveQuoteStreamTransport(): Promise<QuoteStreamTransport> {
    if (this.tws.isConfigured() && (await this.shouldUseTwsQuoteStream())) {
      return "tws";
    }
    if (this.ibkr.isConfigured()) {
      return "ibkr";
    }
    return "poll";
  }

  private async shouldUseTwsQuoteStream(): Promise<boolean> {
    await this.ensureTwsGatewayProbe();
    const decision = this.twsRoutingDecision("quotes");
    if (!decision.shouldTry) {
      return false;
    }
    const status = await this.tws.probeStatus?.(2_000);
    if (!status?.sidecarReachable) {
      twsHealthGate.recordFailure("sidecar_unreachable");
      return false;
    }
    if (status.restartRequired || status.diagnostics?.workerWedged) {
      twsHealthGate.recordFailure("provider_error");
      return false;
    }
    const client = this.tws.getClient?.();
    if (client && "probeHealth" in client && typeof client.probeHealth === "function") {
      const health = await client.probeHealth(2_000);
      if (isStaleTwsSidecarHealth(health)) {
        twsHealthGate.recordFailure("provider_error");
        return false;
      }
    }
    return true;
  }

  /** Clear TWS skip state and stale Yahoo hot/cache entries after sidecar reconnect. */
  resetTwsRecoveryState(args: {
    symbols?: string[];
    candleRequests?: CandleRequest[];
  } = {}): void {
    twsHealthGate.reset();
    this.twsGatewayProbeAt = 0;
    this.twsGatewayConnected = true;
    this.candlesRevalidateKeys.clear();
    this.quotesRevalidateKey = null;
    this.optionExpRevalidateKeys.clear();
    this.optionsChainRevalidateKeys.clear();

    const symbols = [
      ...new Set((args.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)),
    ];
    const candleRequests = args.candleRequests ?? [];

    invalidateHotRecoveryKeys({ symbols, candleRequests });

    if (symbols.length > 0) {
      globalDataCache.delete("quotes", this.quotesCacheKey("yahoo", symbols));
      globalDataCache.delete("quotes", this.quotesCacheKey("tws", symbols));
      globalDataCache.delete("quotes", this.quotesCacheKey("ibkr", symbols));
    }
    for (const request of candleRequests) {
      globalDataCache.delete("candles", this.candlesCacheKey("yahoo", request));
      globalDataCache.delete("candles", this.candlesCacheKey("tws", request));
      globalDataCache.delete("candles", this.candlesCacheKey("ibkr", request));
    }
  }

  /** Best-effort warmup for watchlist/chart/options symbols. Quotes are client-owned. */
  async primeMarketData(args: {
    symbols?: string[];
    candleRequests?: CandleRequest[];
    optionsSymbol?: string;
    activeCellIndex?: number;
    traceId?: string;
  }): Promise<WarmupReport> {
    const startedAt = Date.now();
    const phases: WarmupPhaseReport[] = [];
    const traceId = args.traceId;
    const readOptions: MarketDataReadOptions = traceId ? { traceId } : {};
    const symbols = [
      ...new Set((args.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)),
    ];

    await this.ensureTwsGatewayProbe();
    const twsDecision = this.twsRoutingDecision("quotes");

    if (symbols.length > 0 && this.tws.isConfigured() && twsDecision.shouldTry) {
      const phaseStart = Date.now();
      try {
        await Promise.race([
          this.tws.warmup?.(symbols) ?? Promise.resolve(),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error(`TWS warmup timed out after ${TWS_WARMUP_BUDGET_MS}ms`)),
              TWS_WARMUP_BUDGET_MS,
            );
          }),
        ]);
        phases.push({
          name: "tws.warmup",
          ms: Date.now() - phaseStart,
          ok: true,
          key: symbols.join(","),
        });
      } catch (error) {
        this.recordTwsFailure(error);
        phases.push({
          name: "tws.warmup",
          ms: Date.now() - phaseStart,
          ok: false,
          key: symbols.join(","),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (symbols.length > 0 && this.tws.isConfigured() && !twsDecision.shouldTry) {
      phases.push({
        name: "tws.warmup",
        ms: 0,
        ok: false,
        key: symbols.join(","),
        error: twsDecision.warning ?? "TWS warmup skipped",
      });
    }

    const runCandleTask = async (request: CandleRequest) => {
      const phaseStart = Date.now();
      const key = `${request.symbol}|${request.interval}|${request.range ?? "1y"}`;
      try {
        const result = await this.getCandles(request, readOptions);
        phases.push({
          name: "candles",
          key,
          ms: Date.now() - phaseStart,
          ok: true,
          source: result.source,
          cacheTier: result.cacheTier,
        });
      } catch (error) {
        phases.push({
          name: "candles",
          key,
          ms: Date.now() - phaseStart,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const candleRequests = args.candleRequests ?? [];
    const activeIndex = args.activeCellIndex ?? 0;
    const primaryRequest =
      activeIndex >= 0 && activeIndex < candleRequests.length
        ? candleRequests[activeIndex]
        : candleRequests[0];
    const secondaryRequests = candleRequests.filter((_, index) => index !== activeIndex);

    if (primaryRequest) {
      await runCandleTask(primaryRequest);
    }
    if (secondaryRequests.length > 0) {
      await Promise.all(secondaryRequests.map((request) => runCandleTask(request)));
    }

    const optionsSymbol = args.optionsSymbol?.trim().toUpperCase();
    if (optionsSymbol) {
      const canTryMassiveOptions = this.massive.isConfigured();
      const canTryTwsOptions =
        !canTryMassiveOptions &&
        this.tws.isConfigured() &&
        twsHealthGate.shouldTryTws("options");
      const canTryIbkrOptions =
        !canTryMassiveOptions &&
        this.ibkr.isConfigured() &&
        ibkrHealthGate.shouldTryIbkr("options");
      if (!canTryMassiveOptions && !canTryTwsOptions && !canTryIbkrOptions) {
        phases.push({
          name: "options.expirations",
          key: optionsSymbol,
          ms: 0,
          ok: false,
          error: "Options warmup deferred — Massive/TWS/IBKR unavailable",
        });
      } else {
        const phaseStart = Date.now();
        try {
          const expResult = await this.getOptionExpirations(optionsSymbol);
          phases.push({
            name: "options.expirations",
            key: optionsSymbol,
            ms: Date.now() - phaseStart,
            ok: true,
            source: expResult.source,
            cacheTier: expResult.cacheTier,
          });
        } catch (error) {
          phases.push({
            name: "options",
            key: optionsSymbol,
            ms: Date.now() - phaseStart,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {
      startedAt,
      totalMs: Date.now() - startedAt,
      phases,
      traceId,
    };
  }
}

export function createMarketDataService(deps: MarketDataServiceDeps): MarketDataService {
  return new MarketDataService(deps);
}

export { resetTwsHealthGateForTests, resetIbkrHealthGateForTests, clearHotStoreForTests };

export function clearMarketDataCacheForTests(): void {
  clearLegacyDataCacheForTests();
  clearHotStoreForTests();
}

function defaultMacroDateWindow(query: MarketEventsQuery): { from: string; to: string } {
  const today = new Date();
  const from = query.from ?? today.toISOString().slice(0, 10);
  if (query.to) {
    return { from, to: query.to };
  }
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 90);
  return { from, to: end.toISOString().slice(0, 10) };
}
