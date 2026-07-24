import type {
  FmpAnalystEstimate,
  FmpCompanyProfile,
  FmpExecutive,
  FmpFinancialsBundle,
  FmpMarketMover,
  FmpMarketMoverKind,
  FmpSecFiling,
  FmpStatementPeriod,
} from "../contracts/fmp";
import { createDataResult, type DataResult } from "../contracts/result";
import { buildCacheKey, cacheTtlMs } from "../cache";
import { globalDataCache } from "../cache/serverCacheBackends";
import {
  buildDescriptorMap,
  enrichMoversWithDescriptors,
} from "../screenerUniverse/enrichMoversWithDescriptors";
import { fetchUniverseDescriptors } from "../screenerUniverse/universeDailyStore";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function getFmpCompanyProfile(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<FmpCompanyProfile | null>> {
  const requestedAt = Date.now();
  if (!svc.fmp.isConfigured()) {
    return createDataResult(null, "fmp", {
      requestedAt,
      warnings: ["FMP_API_KEY is not configured"],
    });
  }
  const sym = symbol.trim().toUpperCase();
  const cacheKey = buildCacheKey(["fmp-profile", sym]);
  const cached = await Promise.resolve(globalDataCache.read<FmpCompanyProfile | null>("fmp_profile", cacheKey));
  if (cached.hit) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getCompanyProfile(sym);
  await Promise.resolve(globalDataCache.write(
    "fmp_profile",
    cacheKey,
    result.profile,
    cacheTtlMs("fmp_profile"),
    Date.now(),
  ));
  return createDataResult(result.profile, "fmp", {
    requestedAt,
    warnings: result.warnings,
  });
}


export async function getFmpAnalystEstimates(svc: MarketDataServiceHost, args: {
  symbol: string;
  period?: FmpStatementPeriod;
  limit?: number;
}): Promise<DataResult<FmpAnalystEstimate[]>> {
  const requestedAt = Date.now();
  if (!svc.fmp.isConfigured()) {
    return createDataResult([], "fmp", {
      requestedAt,
      warnings: ["FMP_API_KEY is not configured"],
    });
  }
  const sym = args.symbol.trim().toUpperCase();
  const period = args.period ?? "annual";
  const limit = args.limit ?? 4;
  const cacheKey = buildCacheKey(["fmp-estimates", sym, period, limit]);
  const cached = await Promise.resolve(globalDataCache.read<FmpAnalystEstimate[]>("fmp_estimates", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getAnalystEstimates({ symbol: sym, period, limit });
  await Promise.resolve(globalDataCache.write(
    "fmp_estimates",
    cacheKey,
    result.estimates,
    cacheTtlMs("fmp_estimates"),
    Date.now(),
  ));
  return createDataResult(result.estimates, "fmp", {
    requestedAt,
    warnings: result.warnings,
  });
}


export async function getFmpFinancials(svc: MarketDataServiceHost, args: {
  symbol: string;
  period?: FmpStatementPeriod;
  limit?: number;
}): Promise<DataResult<FmpFinancialsBundle>> {
  const requestedAt = Date.now();
  const sym = args.symbol.trim().toUpperCase();
  const period = args.period ?? "annual";
  const limit = args.limit ?? 4;
  if (!svc.fmp.isConfigured()) {
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
  const cached = await Promise.resolve(globalDataCache.read<FmpFinancialsBundle>("fmp_financials", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getFinancialsBundle({ symbol: sym, period, limit });
  await Promise.resolve(globalDataCache.write(
    "fmp_financials",
    cacheKey,
    result.bundle,
    cacheTtlMs("fmp_financials"),
    Date.now(),
  ));
  return createDataResult(result.bundle, "fmp", {
    requestedAt,
    warnings: result.warnings,
  });
}


export async function getFmpExecutives(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<FmpExecutive[]>> {
  const requestedAt = Date.now();
  if (!svc.fmp.isConfigured()) {
    return createDataResult([], "fmp", {
      requestedAt,
      warnings: ["FMP_API_KEY is not configured"],
    });
  }
  const sym = symbol.trim().toUpperCase();
  const cacheKey = buildCacheKey(["fmp-executives", sym]);
  const cached = await Promise.resolve(globalDataCache.read<FmpExecutive[]>("fmp_executives", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getExecutives(sym);
  await Promise.resolve(globalDataCache.write(
    "fmp_executives",
    cacheKey,
    result.executives,
    cacheTtlMs("fmp_executives"),
    Date.now(),
  ));
  return createDataResult(result.executives, "fmp", {
    requestedAt,
    warnings: result.warnings,
  });
}


export async function getFmpSecFilings(svc: MarketDataServiceHost, args: {
  symbol: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<DataResult<FmpSecFiling[]>> {
  const requestedAt = Date.now();
  if (!svc.fmp.isConfigured()) {
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
  const cached = await Promise.resolve(globalDataCache.read<FmpSecFiling[]>("fmp_filings", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getSecFilings(args);
  await Promise.resolve(globalDataCache.write(
    "fmp_filings",
    cacheKey,
    result.filings,
    cacheTtlMs("fmp_filings"),
    Date.now(),
  ));
  return createDataResult(result.filings, "fmp", {
    requestedAt,
    warnings: result.warnings,
  });
}


export async function getFmpMarketMovers(svc: MarketDataServiceHost, args: {
  kind?: FmpMarketMoverKind;
  limit?: number;
}): Promise<DataResult<FmpMarketMover[]>> {
  const requestedAt = Date.now();
  if (!svc.fmp.isConfigured()) {
    return createDataResult([], "fmp", {
      requestedAt,
      warnings: ["FMP_API_KEY is not configured"],
    });
  }
  const kind = args.kind ?? "gainers";
  const limit = args.limit ?? 10;
  const cacheKey = buildCacheKey(["fmp-movers", kind, limit]);
  const cached = await Promise.resolve(globalDataCache.read<FmpMarketMover[]>("fmp_movers", cacheKey));
  if (cached.hit && cached.value) {
    return createDataResult(cached.value, "fmp", { requestedAt, asOf: cached.asOf });
  }
  const result = await svc.fmp.getMarketMovers({ kind, limit });
  let movers = result.movers;
  const warnings = [...result.warnings];
  try {
    const descriptorResult = await fetchUniverseDescriptors(svc.fmp);
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
  await Promise.resolve(globalDataCache.write(
    "fmp_movers",
    cacheKey,
    movers,
    cacheTtlMs("fmp_movers"),
    Date.now(),
  ));
  return createDataResult(movers, "fmp", {
    requestedAt,
    warnings,
  });
}

