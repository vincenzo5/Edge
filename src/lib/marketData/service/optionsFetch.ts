import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../contracts/options";
import { createDataResult, type DataResult } from "../contracts/result";
import { cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import {
  globalHotStore,
  hotOptionExpirationsKey,
  hotOptionsChainKey,
  writeHotOptionExpirations,
  writeHotOptionsChain,
} from "../hotStore";
import {
  finalizeRouteDelivery,
  recordTerminalFailureOnReject,
  recordServiceDelivery,
} from "../state/serviceInstrumentation";
import {
  optionExpirationsCacheKey,
  optionsChainCacheKey,
} from "./cacheKeys";
import {
  recordTwsFailure,
  recordTwsSuccess,
  resolveReadWaterfall,
  twsRoutingDecision,
} from "./providerRouting";
import { hotCacheTier, type MarketDataReadOptions } from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function getOptionExpirations(
  svc: MarketDataServiceHost,
  underlying: string,
): Promise<DataResult<OptionExpiration[]>> {
  const sym = underlying.trim().toUpperCase();
  const key = hotOptionExpirationsKey(sym);
  const hot = await Promise.resolve(globalHotStore.read<OptionExpiration[]>(key));
  if (hot.hit && hot.data && hot.servable) {
    if (!hot.fresh) {
      scheduleOptionExpirationsRevalidate(svc, sym, key);
    }
    return recordServiceDelivery(
      createDataResult(hot.data, hot.source ?? "mixed", {
        requestedAt: Date.now(),
        asOf: hot.asOf,
        stale: !hot.fresh,
        warnings: hot.warnings ?? [],
        cacheTier: hotCacheTier(hot.fresh),
      }),
      "options_expirations",
      { transport: "cache" },
    );
  }
  const result = await recordTerminalFailureOnReject(
    "options_expirations",
    () => fetchOptionExpirationsFresh(svc, sym),
  );
  writeHotOptionExpirations(sym, result.data, result.source, result.warnings);
  return recordServiceDelivery(
    { ...result, cacheTier: result.cacheTier ?? "cold" },
    "options_expirations",
    { transport: "request" },
  );
}


export function scheduleOptionExpirationsRevalidate(svc: MarketDataServiceHost, underlying: string, key: string): void {
  if (svc.optionExpRevalidateKeys.has(key)) return;
  svc.optionExpRevalidateKeys.add(key);
  void fetchOptionExpirationsFresh(svc, underlying)
    .then((result) => {
      writeHotOptionExpirations(underlying, result.data, result.source, result.warnings);
    })
    .catch(() => {})
    .finally(() => {
      svc.optionExpRevalidateKeys.delete(key);
    });
}


export async function fetchMassiveOptionExpirationsFresh(svc: MarketDataServiceHost, 
  sym: string,
  requestedAt: number,
): Promise<DataResult<OptionExpiration[]> | null> {
  if (!svc.massive.isConfigured()) return null;

  const cacheKey = optionExpirationsCacheKey("massive", sym);
  const cached = await Promise.resolve(globalDataCache.read<OptionExpiration[]>("options_expirations", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "massive", {
      requestedAt,
      asOf: cached.asOf,
    });
  }

  const massiveResult = await svc.massive.getOptionExpirationsWithWarnings(sym);
  await Promise.resolve(globalDataCache.write(
    "options_expirations",
    cacheKey,
    massiveResult.expirations,
    cacheTtlMs("options_expirations"),
    Date.now(),
  ));
  return createDataResult(massiveResult.expirations, "massive", {
    requestedAt,
    warnings: massiveResult.warnings,
  });
}


export async function fetchMassiveOptionsChainFresh(svc: MarketDataServiceHost, 
  request: OptionsChainRequest,
  requestedAt: number,
): Promise<DataResult<OptionsChainResponse> | null> {
  if (!svc.massive.isConfigured()) return null;

  const underlying = request.underlying.trim().toUpperCase();
  const expiration = request.expiration ?? "";
  const strikeWindow = request.strikeWindow ?? { mode: "atm" as const, count: 20 };

  const cacheKey = optionsChainCacheKey("massive", underlying, expiration, strikeWindow);
  const cached = await Promise.resolve(globalDataCache.read<OptionsChainResponse>("options_chain", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "massive", {
      requestedAt,
      asOf: cached.asOf,
    });
  }

  const massiveResult = await svc.massive.getOptionsChainWithWarnings({
    underlying,
    expiration,
    strikeWindow,
  });
  await Promise.resolve(globalDataCache.write(
    "options_chain",
    cacheKey,
    massiveResult.chain,
    cacheTtlMs("options_chain"),
    Date.now(),
  ));
  return createDataResult(massiveResult.chain, "massive", {
    requestedAt,
    warnings: massiveResult.warnings,
  });
}


export async function fetchOptionExpirationsFresh(svc: MarketDataServiceHost, 
  sym: string,
): Promise<DataResult<OptionExpiration[]>> {
  const requestedAt = Date.now();
  const massiveResult = await fetchMassiveOptionExpirationsFresh(svc, sym, requestedAt);
  if (massiveResult) return massiveResult;

  const warnings: string[] = [];

  if (svc.tws.isConfigured()) {
    const twsDecision = twsRoutingDecision(svc, "options");
    if (twsDecision.shouldTry) {
      const twsCacheKey = optionExpirationsCacheKey("tws", sym);
      const twsCached = await Promise.resolve(globalDataCache.read<OptionExpiration[]>(
        "options_expirations",
        twsCacheKey,
      ));
      if (twsCached.hit && twsCached.value) {
        return createDataResult(twsCached.value, "tws", {
          requestedAt,
          asOf: twsCached.asOf,
        });
      }
      try {
        const twsResult = await svc.tws.getOptionExpirationsWithWarnings(sym);
        if (twsResult && twsResult.expirations.length > 0) {
          recordTwsSuccess(svc, sym);
          await Promise.resolve(globalDataCache.write(
            "options_expirations",
            twsCacheKey,
            twsResult.expirations,
            cacheTtlMs("options_expirations"),
            Date.now(),
          ));
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
        recordTwsFailure(svc, error);
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

  if (svc.ibkr.isConfigured()) {
    const ibkrCacheKey = optionExpirationsCacheKey("ibkr", sym);
    const ibkrCached = await Promise.resolve(globalDataCache.read<OptionExpiration[]>(
      "options_expirations",
      ibkrCacheKey,
    ));
    if (ibkrCached.hit && ibkrCached.value) {
      return createDataResult(ibkrCached.value, "ibkr", {
        requestedAt,
        asOf: ibkrCached.asOf,
        warnings,
      });
    }

    try {
      const ibkrResult = await svc.ibkr.getOptionExpirationsWithWarnings(sym);
      if (ibkrResult && ibkrResult.expirations.length > 0) {
        await Promise.resolve(globalDataCache.write(
          "options_expirations",
          ibkrCacheKey,
          ibkrResult.expirations,
          cacheTtlMs("options_expirations"),
          Date.now(),
        ));
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


export async function getOptionsChain(svc: MarketDataServiceHost, 
  request: OptionsChainRequest,
  options: MarketDataReadOptions = {},
): Promise<DataResult<OptionsChainResponse>> {
  const underlying = request.underlying.trim().toUpperCase();
  const expiration = request.expiration ?? "";
  const strikeWindow = request.strikeWindow ?? { mode: "atm" as const, count: 20 };
  const key = hotOptionsChainKey(underlying, expiration, strikeWindow);
  const hot = await Promise.resolve(globalHotStore.read<OptionsChainResponse>(key));
  if (hot.hit && hot.data && hot.servable) {
    if (!hot.fresh) {
      scheduleOptionsChainRevalidate(svc, 
        { underlying, expiration, strikeWindow },
        key,
      );
    }
    return recordServiceDelivery(
      createDataResult(hot.data, hot.source ?? "mixed", {
        requestedAt: Date.now(),
        asOf: hot.asOf,
        stale: !hot.fresh,
        warnings: hot.warnings ?? [],
        cacheTier: hotCacheTier(hot.fresh),
      }),
      "options_chain",
      { transport: "cache" },
    );
  }
  const result = await recordTerminalFailureOnReject(
    "options_chain",
    () =>
      fetchOptionsChainFresh(svc, 
        {
          underlying,
          expiration,
          strikeWindow,
        },
        options,
      ),
  );
  writeHotOptionsChain(
    { underlying, expiration, strikeWindow },
    result.data,
    result.source,
    result.warnings,
  );
  return recordServiceDelivery(
    { ...result, cacheTier: result.cacheTier ?? "cold" },
    "options_chain",
    { transport: "request" },
  );
}


export function scheduleOptionsChainRevalidate(svc: MarketDataServiceHost, 
  request: OptionsChainRequest,
  key: string,
): void {
  if (svc.optionsChainRevalidateKeys.has(key)) return;
  svc.optionsChainRevalidateKeys.add(key);
  void fetchOptionsChainFresh(svc, request)
    .then((result) => {
      writeHotOptionsChain(request, result.data, result.source, result.warnings);
    })
    .catch(() => {})
    .finally(() => {
      svc.optionsChainRevalidateKeys.delete(key);
    });
}


export async function fetchOptionsChainFresh(svc: MarketDataServiceHost, 
  request: OptionsChainRequest,
  readOptions: Pick<
    MarketDataReadOptions,
    "providerPreference" | "respectProviderPreference" | "trustUsage"
  > = {},
): Promise<DataResult<OptionsChainResponse>> {
  const requestedAt = Date.now();
  const underlying = request.underlying.trim().toUpperCase();
  const expiration = request.expiration ?? "";
  const strikeWindow = request.strikeWindow ?? { mode: "atm" as const, count: 20 };
  const order = resolveReadWaterfall(svc, "options_chain", readOptions);
  const warnings: string[] = [];

  for (const providerId of order) {
    if (providerId === "massive") {
      const massiveResult = await fetchMassiveOptionsChainFresh(svc, 
        { underlying, expiration, strikeWindow },
        requestedAt,
      );
      if (massiveResult) return massiveResult;
      continue;
    }

    if (providerId === "tws" && svc.tws.isConfigured()) {
      const twsDecision = twsRoutingDecision(svc, "options");
      if (!twsDecision.shouldTry) {
        if (twsDecision.warning) {
          warnings.push(twsDecision.warning);
          warnings.push("TWS skipped for options chain; trying next provider");
        }
        continue;
      }
      const twsCacheKey = optionsChainCacheKey("tws", underlying, expiration, strikeWindow);
      const twsCached = await Promise.resolve(globalDataCache.read<OptionsChainResponse>("options_chain", twsCacheKey));
      if (twsCached.hit && twsCached.value) {
        return createDataResult(twsCached.value, "tws", {
          requestedAt,
          asOf: twsCached.asOf,
          warnings,
        });
      }
      try {
        const twsResult = await svc.tws.getOptionsChainWithWarnings({
          underlying,
          expiration,
          strikeWindow,
        });
        if (twsResult && twsResult.chain.contracts.length > 0) {
          recordTwsSuccess(svc, underlying);
          await Promise.resolve(globalDataCache.write(
            "options_chain",
            twsCacheKey,
            twsResult.chain,
            cacheTtlMs("options_chain"),
            Date.now(),
          ));
          return createDataResult(twsResult.chain, "tws", {
            requestedAt,
            warnings: [...warnings, ...twsResult.warnings],
          });
        }
        if (twsResult) {
          warnings.push(
            `TWS returned no contracts for ${underlying} ${expiration}; trying next provider`,
          );
          warnings.push(...twsResult.warnings);
        }
      } catch (error) {
        recordTwsFailure(svc, error);
        warnings.push(
          error instanceof Error
            ? `TWS options chain failed: ${error.message}; trying next provider`
            : "TWS options chain failed; trying next provider",
        );
      }
      continue;
    }

    if (providerId === "ibkr" && svc.ibkr.isConfigured()) {
      const ibkrCacheKey = optionsChainCacheKey("ibkr", underlying, expiration, strikeWindow);
      const ibkrCached = await Promise.resolve(globalDataCache.read<OptionsChainResponse>("options_chain", ibkrCacheKey));
      if (ibkrCached.hit && ibkrCached.value) {
        return createDataResult(ibkrCached.value, "ibkr", {
          requestedAt,
          asOf: ibkrCached.asOf,
          warnings,
        });
      }
      try {
        const ibkrResult = await svc.ibkr.getOptionsChainWithWarnings({
          underlying,
          expiration,
          strikeWindow,
        });
        if (ibkrResult && ibkrResult.chain.contracts.length > 0) {
          await Promise.resolve(globalDataCache.write(
            "options_chain",
            ibkrCacheKey,
            ibkrResult.chain,
            cacheTtlMs("options_chain"),
            Date.now(),
          ));
          return createDataResult(ibkrResult.chain, "ibkr", {
            requestedAt,
            warnings: [...warnings, ...ibkrResult.warnings],
          });
        }
        if (ibkrResult) {
          throw new Error(`IBKR returned no contracts for ${underlying} ${expiration}`);
        }
        throw new Error("IBKR options chain failed");
      } catch (error) {
        throw error instanceof Error ? error : new Error("IBKR options chain failed");
      }
    }
  }

  throw new Error("No configured provider available for options chain");
}

