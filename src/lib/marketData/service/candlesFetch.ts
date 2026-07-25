import type { CandleRequest, CandleResponse } from "../contracts/equities";
import type { DataProviderPreference } from "@/lib/connections/types";
import { createDataResult, type DataResult } from "../contracts/result";
import { cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import { globalHotStore, hotCandlesKey, writeHotCandles } from "../hotStore";
import type { IbkrProvider } from "../providers/ibkr/adapter";
import type { TwsProvider } from "../providers/tws/adapter";
import { shouldSkipHotCacheSource, type TrustUsage } from "../providerWaterfall";
import { isMarketDataPerfEnabled } from "../telemetry/isPerfEnabled";
import { PerfPhaseCollector } from "../telemetry/perfPhases";
import {
  finalizeRouteDelivery,
  inferFallbackReason,
  recordTerminalFailureOnReject,
  recordServiceDelivery,
} from "../state/serviceInstrumentation";
import { RouteCollector } from "../state/routeCollector";
import { equityCandleToLegacyApi } from "../validation/mappers";
import {
  candlesCacheKey,
} from "./cacheKeys";
import {
  ensureIbkrAuthProbe,
  ensureTwsGatewayProbe,
  getConfiguredProviderIds,
  ibkrRoutingDecision,
  recordIbkrFailure,
  recordIbkrSuccess,
  recordTwsFailure,
  recordTwsSuccess,
  resolveReadWaterfall,
  twsRoutingDecision,
} from "./providerRouting";
import {
  attachPerfMeta,
  hotCacheTier,
  type MarketDataReadOptions,
} from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";
import { coalesceInFlight } from "./coalesceInFlight";

export async function fetchYahooCandles(
  svc: MarketDataServiceHost,
  request: CandleRequest,
  requestedAt: number,
): Promise<DataResult<CandleResponse>> {
  const cacheKey = candlesCacheKey("yahoo", request);
  return coalesceInFlight(`candles:yahoo:${cacheKey}`, async () => {
    const cached = await Promise.resolve(globalDataCache.read<CandleResponse>("candles", cacheKey));
    if (cached.hit && cached.value) {
      return createDataResult(cached.value, "yahoo", {
        requestedAt,
        asOf: cached.asOf,
      });
    }
    const data = await svc.yahoo.getCandles(request);
    await Promise.resolve(globalDataCache.write(
      "candles",
      cacheKey,
      data,
      cacheTtlMs("candles", request.interval),
      Date.now(),
    ));
    return createDataResult(data, "yahoo", { requestedAt });
  });
}


export async function fetchProviderCandles(svc: MarketDataServiceHost, 
  providerName: "tws" | "ibkr",
  provider: TwsProvider | IbkrProvider,
  request: CandleRequest,
  requestedAt: number,
  bypassLegacyCache = false,
  twsConnectionId?: string,
): Promise<DataResult<CandleResponse> | null> {
  const cacheKey = candlesCacheKey(
    providerName,
    request,
    providerName === "tws" ? twsConnectionId : undefined,
  );
  return coalesceInFlight(`candles:${providerName}:${cacheKey}`, async () => {
    if (!bypassLegacyCache) {
      const cached = await Promise.resolve(globalDataCache.read<CandleResponse>("candles", cacheKey));
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
      await Promise.resolve(globalDataCache.write(
        "candles",
        cacheKey,
        data,
        cacheTtlMs("candles", request.interval),
        Date.now(),
      ));
      return createDataResult(data, providerName, { requestedAt });
    }
    return null;
  });
}


export async function getCandles(svc: MarketDataServiceHost, 
  request: CandleRequest,
  options: MarketDataReadOptions = {},
): Promise<DataResult<CandleResponse>> {
  const perf = isMarketDataPerfEnabled() ? new PerfPhaseCollector() : null;
  const key = hotCandlesKey(request);
  const hotStart = Date.now();
  const hot = await Promise.resolve(globalHotStore.read<CandleResponse>(key));
  perf?.record("cache.hot.read", hotStart, true, "cache", {
    hit: hot.hit,
    fresh: hot.fresh,
    servable: hot.servable,
    source: hot.source,
  });
  const skipHotEntry = shouldSkipHotCacheSource({
    hotSource: hot.source,
    preference: options.providerPreference,
    configured: getConfiguredProviderIds(svc, ),
    capability: "equity_candles",
    respectPreference: options.respectProviderPreference !== false && options.providerPreference != null,
  });
  if (hot.hit && hot.data && hot.servable && !skipHotEntry) {
    if (!hot.fresh) {
      scheduleCandlesRevalidate(svc, request, key, options);
    }
    return attachPerfMeta(
      recordServiceDelivery(
        createDataResult(hot.data, hot.source ?? "mixed", {
          requestedAt: Date.now(),
          asOf: hot.asOf,
          stale: !hot.fresh,
          warnings: hot.warnings ?? [],
          cacheTier: hotCacheTier(hot.fresh),
        }),
        "chart_candles",
        { transport: "cache", traceId: options.traceId },
      ),
      options.traceId,
      perf,
    );
  }
  const freshStart = Date.now();
  const result = await recordTerminalFailureOnReject(
    "chart_candles",
    () =>
      fetchCandlesFresh(svc, request, {
        perf,
        twsConnectionId: options.twsConnectionId,
        providerPreference: options.providerPreference,
        respectProviderPreference: options.respectProviderPreference,
        trustUsage: options.trustUsage,
      }),
  );
  perf?.record("service.fetchCandlesFresh", freshStart, true, "service", {
    source: result.source,
    cacheTier: result.cacheTier ?? "cold",
    barCount: result.data.candles.length,
  });
  writeHotCandles(request, result.data, result.source, result.warnings);
  return attachPerfMeta(
    recordServiceDelivery(
      { ...result, cacheTier: result.cacheTier ?? "cold" },
      "chart_candles",
      { transport: "request", traceId: options.traceId },
    ),
    options.traceId,
    perf,
  );
}


export function scheduleCandlesRevalidate(svc: MarketDataServiceHost, 
  request: CandleRequest,
  key: string,
  options: Pick<MarketDataReadOptions, "twsConnectionId" | "providerPreference" | "respectProviderPreference" | "trustUsage"> = {},
): void {
  if (svc.candlesRevalidateKeys.has(key)) return;
  svc.candlesRevalidateKeys.add(key);
  void fetchCandlesFresh(svc, request, { bypassLegacyCache: true, ...options })
    .then((result) => {
      writeHotCandles(request, result.data, result.source, result.warnings);
      recordServiceDelivery(result, "chart_candles", { transport: "cache" });
    })
    .catch((error) => {
      recordServiceDelivery(
        createDataResult(
          { symbol: request.symbol, interval: request.interval, candles: [] },
          "unknown",
          {
            requestedAt: Date.now(),
            warnings: [
              error instanceof Error
                ? `Background candle revalidation failed: ${error.message}`
                : "Background candle revalidation failed",
            ],
            stale: true,
          },
        ),
        "chart_candles",
        { transport: "cache" },
      );
    })
    .finally(() => {
      svc.candlesRevalidateKeys.delete(key);
    });
}


export async function fetchCandlesFresh(svc: MarketDataServiceHost, 
  request: CandleRequest,
  options: {
    bypassLegacyCache?: boolean;
    perf?: PerfPhaseCollector | null;
    twsConnectionId?: string;
    providerPreference?: DataProviderPreference;
    respectProviderPreference?: boolean;
    trustUsage?: TrustUsage;
  } = {},
): Promise<DataResult<CandleResponse>> {
  const requestedAt = Date.now();
  const providerWarnings: string[] = [];
  const perf = options.perf ?? null;
  const route = new RouteCollector();
  const order = resolveReadWaterfall(svc, "equity_candles", options);

  await ensureTwsGatewayProbe(svc, );

  for (const providerId of order) {
    if (providerId === "yahoo") {
      const yahooStart = Date.now();
      const yahooResult = await fetchYahooCandles(svc, request, requestedAt);
      route.recordSuccess("yahoo", yahooStart);
      perf?.record("provider.yahoo.candles", yahooStart, true, "provider", {
        source: "yahoo",
        barCount: yahooResult.data.candles.length,
        stale: yahooResult.stale,
      });
      const result = createDataResult(yahooResult.data, yahooResult.source, {
        requestedAt,
        asOf: yahooResult.asOf,
        stale: yahooResult.stale,
        warnings: [...providerWarnings, ...yahooResult.warnings],
      });
      return finalizeRouteDelivery(result, "chart_candles", route, {
        fallbackReason:
          providerWarnings.length > 0
            ? inferFallbackReason([...providerWarnings, ...yahooResult.warnings])
            : undefined,
        transport: "request",
      });
    }

    if (providerId === "tws") {
      const twsDecision = twsRoutingDecision(svc, "candles");
      if (!twsDecision.shouldTry) {
        if (twsDecision.warning) {
          route.recordSkipped("tws", twsDecision.warning);
          providerWarnings.push(twsDecision.warning);
        }
        continue;
      }
      const twsStart = Date.now();
      try {
        const twsResult = await fetchProviderCandles(svc, 
          "tws",
          svc.tws,
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
          recordTwsSuccess(svc, request.symbol);
          route.recordSuccess("tws", twsStart);
          return finalizeRouteDelivery(twsResult, "chart_candles", route, {
            transport: "request",
          });
        }
        perf?.record("provider.tws.candles", twsStart, false, "provider", { reason: "empty" });
        route.recordEmpty("tws", twsStart);
        providerWarnings.push("TWS returned no candles; trying next provider");
      } catch (error) {
        perf?.record("provider.tws.candles", twsStart, false, "provider", {
          error: error instanceof Error ? error.message : String(error),
        });
        route.recordFailure("tws", twsStart, error);
        recordTwsFailure(svc, error);
        providerWarnings.push(
          error instanceof Error
            ? `TWS candles failed: ${error.message}; trying next provider`
            : "TWS candles failed; trying next provider",
        );
      }
      continue;
    }

    if (providerId === "ibkr") {
      await ensureIbkrAuthProbe(svc, );
      const ibkrDecision = ibkrRoutingDecision(svc, "candles");
      if (!ibkrDecision.shouldTry) {
        if (ibkrDecision.warning) {
          route.recordSkipped("ibkr", ibkrDecision.warning);
          providerWarnings.push(ibkrDecision.warning);
        }
        continue;
      }
      const ibkrStart = Date.now();
      try {
        const ibkrResult = await fetchProviderCandles(svc, 
          "ibkr",
          svc.ibkr,
          request,
          requestedAt,
          options.bypassLegacyCache,
        );
        if (ibkrResult) {
          perf?.record("provider.ibkr.candles", ibkrStart, true, "provider", {
            source: "ibkr",
            barCount: ibkrResult.data.candles.length,
          });
          recordIbkrSuccess(svc, );
          route.recordSuccess("ibkr", ibkrStart);
          const result = createDataResult(ibkrResult.data, ibkrResult.source, {
            requestedAt,
            warnings: providerWarnings,
            phases: ibkrResult.phases,
          });
          return finalizeRouteDelivery(result, "chart_candles", route, {
            fallbackReason: inferFallbackReason(providerWarnings),
            transport: "request",
          });
        }
        perf?.record("provider.ibkr.candles", ibkrStart, false, "provider", { reason: "empty" });
        route.recordEmpty("ibkr", ibkrStart);
        providerWarnings.push("IBKR returned no candles; trying next provider");
      } catch (error) {
        perf?.record("provider.ibkr.candles", ibkrStart, false, "provider", {
          error: error instanceof Error ? error.message : String(error),
        });
        route.recordFailure("ibkr", ibkrStart, error);
        recordIbkrFailure(svc, error);
        providerWarnings.push(
          error instanceof Error
            ? `IBKR candles failed: ${error.message}; trying next provider`
            : "IBKR candles failed; trying next provider",
        );
      }
    }
  }

  const yahooStart = Date.now();
  const yahooOnly = await fetchYahooCandles(svc, request, requestedAt);
  route.recordSuccess("yahoo", yahooStart);
  perf?.record("provider.yahoo.candles", yahooStart, true, "provider", {
    source: "yahoo",
    barCount: yahooOnly.data.candles.length,
    stale: yahooOnly.stale,
  });
  return finalizeRouteDelivery(yahooOnly, "chart_candles", route, {
    fallbackReason: inferFallbackReason(providerWarnings),
    transport: "request",
  });
}

/** Legacy API shape for /api/candles and chart fetchers. */

export async function getLegacyCandles(svc: MarketDataServiceHost, 
  request: CandleRequest,
  options: MarketDataReadOptions = {},
): Promise<
  DataResult<Array<ReturnType<typeof equityCandleToLegacyApi>>>
> {
  const result = await getCandles(svc, request, options);
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

