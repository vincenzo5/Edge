/** Known production data providers in Edge. */
export type DataProviderId =
  | "yahoo"
  | "sec"
  | "fred"
  | "fmp"
  | "massive"
  | "alphaVantage"
  | "tradier"
  | "alpaca"
  | "ibkr"
  | "tws";

export type DataCacheTier = "hot-fresh" | "hot-stale" | "cold" | "universe";

export type MarketDataPerfPhase = {
  name: string;
  ms: number;
  ok: boolean;
  layer?: "client" | "api" | "service" | "cache" | "provider" | "sidecar" | "chart";
  detail?: Record<string, unknown>;
};

export type DataErrorCode =
  | "validation"
  | "provider_unavailable"
  | "entitlement"
  | "not_found"
  | "upstream";

export type DataError = {
  code: DataErrorCode;
  message: string;
  provider?: DataProviderId | string;
};

/** Envelope for normalized data reads with freshness metadata. */
export type DataResult<T> = {
  data: T;
  source: DataProviderId | string;
  requestedAt: number;
  receivedAt: number;
  asOf?: number;
  stale: boolean;
  warnings: string[];
  cacheTier?: DataCacheTier;
  traceId?: string;
  phases?: MarketDataPerfPhase[];
  indicatorValues?: Record<string, Record<string, number>>;
  skippedSymbols?: string[];
};

export type DataResultOptions = {
  requestedAt?: number;
  receivedAt?: number;
  asOf?: number;
  stale?: boolean;
  warnings?: string[];
  cacheTier?: DataCacheTier;
  traceId?: string;
  phases?: MarketDataPerfPhase[];
  indicatorValues?: Record<string, Record<string, number>>;
  skippedSymbols?: string[];
};

export function createDataResult<T>(
  data: T,
  source: DataProviderId | string,
  options?: DataResultOptions,
): DataResult<T> {
  const now = Date.now();
  return {
    data,
    source,
    requestedAt: options?.requestedAt ?? now,
    receivedAt: options?.receivedAt ?? now,
    asOf: options?.asOf,
    stale: options?.stale ?? false,
    warnings: options?.warnings ?? [],
    cacheTier: options?.cacheTier,
    traceId: options?.traceId,
    phases: options?.phases,
    indicatorValues: options?.indicatorValues,
    skippedSymbols: options?.skippedSymbols,
  };
}

/** Optional API response metadata alongside legacy data fields. */
export type DataResponseMeta = {
  source: DataProviderId | string;
  warnings: string[];
  stale: boolean;
  asOf?: number;
  latencyMs?: number;
  cacheTier?: DataCacheTier;
  traceId?: string;
  phases?: MarketDataPerfPhase[];
  indicatorValues?: Record<string, Record<string, number>>;
  skippedSymbols?: string[];
};

export function dataResultToResponseMeta<T>(result: DataResult<T>): DataResponseMeta {
  return {
    source: result.source,
    warnings: result.warnings,
    stale: result.stale,
    asOf: result.asOf,
    latencyMs: Math.max(0, result.receivedAt - result.requestedAt),
    cacheTier: result.cacheTier,
    traceId: result.traceId,
    phases: result.phases,
    indicatorValues: result.indicatorValues,
    skippedSymbols: result.skippedSymbols,
  };
}
