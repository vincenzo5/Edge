import type { CandleRequest, EquityQuote } from "../contracts/equities";
import { createDataResult, type DataResult } from "../contracts/result";
import { cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import { globalHotStore, hotQuoteKey, writeHotQuote } from "../hotStore";
import type { IbkrProvider } from "../providers/ibkr/adapter";
import type { TwsProvider } from "../providers/tws/adapter";
import { shouldSkipHotCacheSource } from "../providerWaterfall";
import { isMarketDataPerfEnabled } from "../telemetry/isPerfEnabled";
import { PerfPhaseCollector } from "../telemetry/perfPhases";
import {
  finalizeRouteDelivery,
  inferFallbackReason,
  recordTerminalFailureOnReject,
  recordServiceDelivery,
} from "../state/serviceInstrumentation";
import { RouteCollector } from "../state/routeCollector";
import type { QuoteSnapshot } from "@/lib/watchlist/types";
import { equityQuoteToWatchlistQuote } from "../validation/mappers";
import { quotesCacheKey } from "./cacheKeys";
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
  oldestQuoteUpdatedAt,
  type MarketDataReadOptions,
} from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function fetchYahooQuotes(
  svc: MarketDataServiceHost,
  symbols: string[],
  requestedAt: number,
  extraWarnings: string[] = [],
): Promise<DataResult<EquityQuote[]>> {
  const cacheKey = quotesCacheKey("yahoo", symbols);
  const cached = await Promise.resolve(globalDataCache.read<EquityQuote[]>("quotes", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "yahoo", {
      requestedAt,
      asOf: cached.asOf,
      warnings: extraWarnings,
    });
  }
  const data = await svc.yahoo.getQuotes(symbols);
  await Promise.resolve(globalDataCache.write("quotes", cacheKey, data, cacheTtlMs("quotes"), Date.now()));
  return createDataResult(data, "yahoo", { requestedAt, warnings: extraWarnings });
}


export async function fetchProviderQuotes(svc: MarketDataServiceHost, 
  providerName: "tws" | "ibkr",
  provider: TwsProvider | IbkrProvider,
  normalized: string[],
  requestedAt: number,
  twsConnectionId?: string,
): Promise<{ quotes: EquityQuote[]; missingSymbols: string[]; source: "tws" | "ibkr" | "mixed" } | null> {
  const cacheKey = quotesCacheKey(
    providerName,
    normalized,
    providerName === "tws" ? twsConnectionId : undefined,
  );
  const cached = await Promise.resolve(globalDataCache.read<EquityQuote[]>("quotes", cacheKey));
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
    await Promise.resolve(globalDataCache.write("quotes", cacheKey, batch.quotes, cacheTtlMs("quotes"), Date.now()));
  }
  return {
    quotes: batch.quotes,
    missingSymbols: batch.missingSymbols,
    source,
  };
}


export async function getQuotes(svc: MarketDataServiceHost, 
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
  const staleHotSymbols: string[] = [];
  const hotStart = Date.now();
  let hotHits = 0;

  for (const sym of normalized) {
    const hot = await Promise.resolve(globalHotStore.read<EquityQuote>(hotQuoteKey(sym)));
    const skipHotEntry = shouldSkipHotCacheSource({
      hotSource: hot.source,
      preference: options.providerPreference,
      configured: getConfiguredProviderIds(svc, ),
      capability: "equity_quotes",
      respectPreference: options.respectProviderPreference !== false && options.providerPreference != null,
    });
    if (hot.hit && hot.data && hot.servable && !skipHotEntry) {
      hotHits += 1;
      fromHot.push(hot.data);
      if (!hot.fresh) {
        anyStale = true;
        staleHotSymbols.push(sym);
      }
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
      scheduleQuotesRevalidate(svc, normalized, options);
    }
    return attachPerfMeta(
      recordServiceDelivery(
        createDataResult(fromHot, primarySource ?? "yahoo", {
          requestedAt,
          asOf: oldestQuoteUpdatedAt(fromHot),
          stale: anyStale,
          warnings: hotWarnings,
          cacheTier: hotCacheTier(!anyStale),
        }),
        "watchlist_quotes",
        { transport: "cache", traceId: options.traceId },
      ),
      options.traceId,
      perf,
    );
  }

  const hotBySymbol = new Map(fromHot.map((quote) => [quote.symbol, quote]));
  const missingSymbols = normalized.filter((sym) => !hotBySymbol.has(sym));

  if (fromHot.length > 0 && missingSymbols.length > 0) {
    const freshStart = Date.now();
    const fresh = await recordTerminalFailureOnReject(
      "watchlist_quotes",
      () => fetchQuotesFresh(svc, missingSymbols, requestedAt, perf, options),
    );
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
      scheduleQuotesRevalidate(svc, staleHotSymbols, options);
    }
    return attachPerfMeta(
      recordServiceDelivery(
        createDataResult(merged, mergedSource, {
          requestedAt,
          asOf: oldestQuoteUpdatedAt(merged),
          stale: anyStale,
          warnings: [...hotWarnings, ...fresh.warnings],
          cacheTier: hotCacheTier(!anyStale && fresh.cacheTier === "hot-fresh"),
        }),
        "watchlist_quotes",
        { transport: "cache", traceId: options.traceId },
      ),
      options.traceId,
      perf,
    );
  }

  const freshStart = Date.now();
  const result = await recordTerminalFailureOnReject(
    "watchlist_quotes",
    () => fetchQuotesFresh(svc, normalized, requestedAt, perf, options),
  );
  perf?.record("service.fetchQuotesFresh", freshStart, true, "service", {
    source: result.source,
    quoteCount: result.data.length,
  });
  for (const quote of result.data) {
    writeHotQuote(quote, result.source, result.warnings);
  }
  return attachPerfMeta(result, options.traceId, perf);
}


export function scheduleQuotesRevalidate(svc: MarketDataServiceHost, 
  symbols: string[],
  options: Pick<MarketDataReadOptions, "twsConnectionId" | "providerPreference" | "respectProviderPreference" | "trustUsage"> = {},
): void {
  if (symbols.length === 0) return;
  const key = `${options.twsConnectionId ?? ""}|${symbols.join(",")}|${JSON.stringify(options.providerPreference ?? null)}`;
  if (svc.quotesRevalidateKey === key) return;
  svc.quotesRevalidateKey = key;
  void fetchQuotesFresh(svc, symbols, Date.now(), null, options)
    .then((result) => {
      for (const quote of result.data) {
        writeHotQuote(quote, result.source, result.warnings);
      }
      recordServiceDelivery(result, "watchlist_quotes", { transport: "cache" });
    })
    .catch((error) => {
      recordServiceDelivery(
        createDataResult([], "unknown", {
          requestedAt: Date.now(),
          warnings: [
            error instanceof Error
              ? `Background quote revalidation failed: ${error.message}`
              : "Background quote revalidation failed",
          ],
          stale: true,
        }),
        "watchlist_quotes",
        { transport: "cache" },
      );
    })
    .finally(() => {
      if (svc.quotesRevalidateKey === key) {
        svc.quotesRevalidateKey = null;
      }
    });
}


export async function fetchQuotesFresh(svc: MarketDataServiceHost, 
  normalized: string[],
  requestedAt: number,
  perf: PerfPhaseCollector | null = null,
  options: Pick<
    MarketDataReadOptions,
    "twsConnectionId" | "providerPreference" | "respectProviderPreference" | "trustUsage"
  > = {},
): Promise<DataResult<EquityQuote[]>> {
  const route = new RouteCollector();
  const order = resolveReadWaterfall(svc, "equity_quotes", options);
  const providerWarnings: string[] = [];
  const quoteBySymbol = new Map<string, EquityQuote>();
  let primarySource: "tws" | "ibkr" | "yahoo" | "mixed" | null = null;

  const mergeBatch = (
    batch: { quotes: EquityQuote[]; missingSymbols: string[]; source: "tws" | "ibkr" | "mixed" },
    label: string,
  ) => {
    for (const quote of batch.quotes) {
      quoteBySymbol.set(quote.symbol, quote);
    }
    if (batch.missingSymbols.length > 0) {
      providerWarnings.push(`${label} could not resolve: ${batch.missingSymbols.join(", ")}`);
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

  await ensureTwsGatewayProbe(svc, );

  for (const providerId of order) {
    const unresolved = normalized.filter((sym) => !quoteBySymbol.has(sym));
    if (unresolved.length === 0) break;

    if (providerId === "yahoo") {
      providerWarnings.push(`Filling via Yahoo: ${unresolved.join(", ")}`);
      const yahooStart = Date.now();
      const yahooFill = await svc.yahoo.getQuotes(unresolved);
      route.recordSuccess("yahoo", yahooStart);
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
      continue;
    }

    if (providerId === "tws") {
      const twsDecision = twsRoutingDecision(svc, "quotes");
      if (!twsDecision.shouldTry) {
        if (twsDecision.warning) {
          route.recordSkipped("tws", twsDecision.warning);
          providerWarnings.push(twsDecision.warning);
        }
        continue;
      }
      const twsStart = Date.now();
      try {
        const twsBatch = await fetchProviderQuotes(svc, 
          "tws",
          svc.tws,
          unresolved,
          requestedAt,
          options.twsConnectionId,
        );
        if (twsBatch) {
          if (twsBatch.quotes.length > 0) {
            recordTwsSuccess(svc, );
            route.recordSuccess("tws", twsStart);
          } else {
            route.recordEmpty("tws", twsStart);
          }
          perf?.record("provider.tws.quotes", twsStart, true, "provider", {
            quoteCount: twsBatch.quotes.length,
            missing: twsBatch.missingSymbols.length,
          });
          mergeBatch(twsBatch, "TWS");
        } else {
          route.recordEmpty("tws", twsStart);
          providerWarnings.push("TWS returned no quotes; trying next provider");
        }
      } catch (error) {
        route.recordFailure("tws", twsStart, error);
        recordTwsFailure(svc, error);
        providerWarnings.push(
          error instanceof Error
            ? `TWS quotes failed: ${error.message}; trying next provider`
            : "TWS quotes failed; trying next provider",
        );
      }
      continue;
    }

    if (providerId === "ibkr") {
      await ensureIbkrAuthProbe(svc, );
      const ibkrDecision = ibkrRoutingDecision(svc, "quotes");
      if (!ibkrDecision.shouldTry) {
        if (ibkrDecision.warning) {
          route.recordSkipped("ibkr", ibkrDecision.warning);
          providerWarnings.push(ibkrDecision.warning);
        }
        continue;
      }
      const ibkrStart = Date.now();
      try {
        const ibkrBatch = await fetchProviderQuotes(svc, 
          "ibkr",
          svc.ibkr,
          unresolved,
          requestedAt,
        );
        if (ibkrBatch) {
          if (ibkrBatch.quotes.length > 0) {
            recordIbkrSuccess(svc, );
            route.recordSuccess("ibkr", ibkrStart);
          } else {
            route.recordEmpty("ibkr", ibkrStart);
          }
          perf?.record("provider.ibkr.quotes", ibkrStart, true, "provider", {
            quoteCount: ibkrBatch.quotes.length,
            missing: ibkrBatch.missingSymbols.length,
          });
          mergeBatch(ibkrBatch, "IBKR");
        } else {
          route.recordEmpty("ibkr", ibkrStart);
          providerWarnings.push("IBKR returned no quotes for unresolved symbols");
        }
      } catch (error) {
        route.recordFailure("ibkr", ibkrStart, error);
        recordIbkrFailure(svc, error);
        providerWarnings.push(
          error instanceof Error ? `IBKR quotes failed: ${error.message}` : "IBKR quotes failed",
        );
      }
    }
  }

  const stillMissing = normalized.filter((sym) => !quoteBySymbol.has(sym));
  if (stillMissing.length > 0) {
    providerWarnings.push(`Filling via Yahoo: ${stillMissing.join(", ")}`);
    const yahooStart = Date.now();
    const yahooFill = await svc.yahoo.getQuotes(stillMissing);
    route.recordSuccess("yahoo", yahooStart);
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
    const result = createDataResult(merged, primarySource ?? "yahoo", {
      requestedAt,
      warnings: providerWarnings,
      skippedSymbols: stillMissing.length > 0 ? stillMissing : undefined,
    });
    return finalizeRouteDelivery(result, "watchlist_quotes", route, {
      fallbackReason: inferFallbackReason(providerWarnings),
      transport: "request",
    });
  }

  const yahooStart = Date.now();
  const yahooOnly = await fetchYahooQuotes(svc, normalized, requestedAt, providerWarnings);
  route.recordSuccess("yahoo", yahooStart);
  return finalizeRouteDelivery(yahooOnly, "watchlist_quotes", route, {
    fallbackReason: inferFallbackReason(yahooOnly.warnings),
    transport: "request",
  });
}


export async function getWatchlistQuotes(svc: MarketDataServiceHost, 
  symbols: string[],
  options: MarketDataReadOptions = {},
): Promise<DataResult<QuoteSnapshot[]>> {
  const result = await getQuotes(svc, symbols, options);
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

