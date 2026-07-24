import { classifyUsEquitySession, type MarketSessionKind } from "@edge/chart-core";
import { cacheTtlMs, type CacheNamespace } from "../cache/ttlPolicy";
import { HOT_STALE_MS } from "../hotStoreConstants";
import type { DataCacheTier } from "../contracts/result";
import type {
  AvailabilityDimension,
  CoverageDimension,
  FreshnessDimension,
} from "../state/dimensions";
import {
  getDatasetDefinition,
  lookupDataset,
  type DatasetId,
  type FreshnessPolicyRef,
} from "../state/catalog";
import type { DatasetKind } from "./dataTrust";
import { getDatasetPolicy } from "./dataTrust";
import { isNyseFullDayHoliday } from "../marketCalendar";

/** Max acceptable clock skew between provider timestamp and local receipt. */
export const MAX_CLOCK_SKEW_MS = 5 * 60_000;

export type PolicyCadence =
  | "streaming"
  | "intraday"
  | "daily"
  | "event"
  | "on_demand"
  | "static"
  | "not_applicable";

export type EmptySemantics = "valid" | "invalid" | "contextual";

export type TimestampAnomaly =
  | "future_provider_timestamp"
  | "received_before_provider"
  | "clock_skew"
  | "missing_anchor";

export type PolicyEvaluationInput = {
  datasetId: DatasetId | DatasetKind;
  /** Delivery or content receipt time. */
  receivedAt?: number;
  /** Provider/content timestamp. */
  providerAsOf?: number;
  /** Transport/cache stale flag — not business freshness alone. */
  transportStale?: boolean;
  cacheTier?: DataCacheTier;
  /** Requested symbol/item count when known. */
  requestedCount?: number;
  /** Returned record count for array payloads. */
  returnedCount?: number;
  skippedSymbols?: string[];
  /** Null/empty object payload (non-array). */
  isNullPayload?: boolean;
  session?: MarketSessionKind;
  now?: number;
};

export type PolicyEvaluationResult = {
  datasetId: DatasetId;
  policyKind?: DatasetKind;
  cadence: PolicyCadence;
  freshness: FreshnessDimension;
  availability: AvailabilityDimension;
  coverage: CoverageDimension;
  /** Age used for freshness (ms). */
  freshnessAgeMs: number;
  /** Which timestamp anchored freshness. */
  freshnessAnchor: "receivedAt" | "providerAsOf" | "unknown";
  maxFreshnessMs: number;
  displayFresh: boolean;
  anomalies: TimestampAnomaly[];
  reasons: string[];
};

function resolveDatasetId(id: DatasetId | DatasetKind): DatasetId | undefined {
  const direct = lookupDataset(id);
  if (direct) return direct.datasetId;
  const byPolicy = lookupDataset(id as string);
  if (byPolicy?.policyKind === id) return byPolicy.datasetId;
  if (id === "chart_candles" || id === "watchlist_quotes" || id === "options_chain" ||
      id === "options_expirations" || id === "account_summary" || id === "positions" ||
      id === "orders" || id === "fills" || id === "pre_trade_quote") {
    return id as DatasetId;
  }
  return undefined;
}

function cadenceForDataset(datasetId: DatasetId): PolicyCadence {
  switch (datasetId) {
    case "watchlist_quotes":
    case "chart_candles":
      return "streaming";
    case "screener_universe_daily":
    case "account_snapshots":
      return "daily";
    case "events_market":
    case "news_symbol":
    case "macro_series":
      return "event";
    case "instrument_search":
    case "market_data_warmup":
    case "tws_ibkr_probes":
    case "tws_recovery":
      return "on_demand";
    case "chart_indicators":
    case "derived_metrics":
      return "static";
    case "watchlist_library":
    case "screener_library":
    case "chart_workspaces":
    case "chart_templates":
    case "research_notes":
    case "pattern_library":
    case "risk_settings":
    case "order_intents":
    case "market_data_health":
      return "not_applicable";
    default:
      if (datasetId.startsWith("fmp_") || datasetId.startsWith("sec_")) return "event";
      if (datasetId.startsWith("screener_")) return "intraday";
      if (datasetId === "fundamentals_display") return "static";
      if (datasetId === "broker_ledger_ingest" || datasetId === "journal_trades") return "daily";
      return "intraday";
  }
}

function emptySemanticsFor(datasetId: DatasetId): EmptySemantics {
  switch (datasetId) {
    case "news_symbol":
    case "sec_filings_direct":
    case "fmp_sec_filings_search":
    case "screener_descriptive":
    case "screener_technical":
    case "screener_movers":
    case "events_market":
    case "macro_series":
    case "instrument_search":
      return "valid";
    case "watchlist_quotes":
    case "chart_candles":
    case "options_chain":
    case "options_expirations":
    case "account_summary":
    case "positions":
    case "pre_trade_quote":
      return "invalid";
    default:
      return "contextual";
  }
}

function sessionMultiplier(
  session: MarketSessionKind,
  cadence: PolicyCadence,
): number {
  if (cadence === "streaming" || cadence === "intraday") {
    if (session === "closed") return 4;
    if (session === "preMarket" || session === "postMarket") return 2;
  }
  if (cadence === "daily" && (session === "closed" || session === "regular")) {
    return session === "closed" ? 3 : 1;
  }
  return 1;
}

function resolveMaxFreshnessMs(
  policyRef: FreshnessPolicyRef,
  datasetId: DatasetId,
  session: MarketSessionKind,
): number {
  const cadence = cadenceForDataset(datasetId);
  const mult = sessionMultiplier(session, cadence);

  if (policyRef.kind === "dataset_policy") {
    const policy = getDatasetPolicy(policyRef.policyKind);
    const base = policy.maxDisplayAgeMs ?? policy.maxAgeMs ?? HOT_STALE_MS.candles;
    return Math.round(base * mult);
  }
  if (policyRef.kind === "ttl") {
    const ns = policyRef.namespace === "context" ? "market_context" : policyRef.namespace;
    const ttl = cacheTtlMs(ns as CacheNamespace);
    return Math.round(ttl * mult);
  }
  if (policyRef.kind === "inherits") {
    const parent = getDatasetDefinition(policyRef.datasetId);
    return resolveMaxFreshnessMs(parent.freshnessPolicy, parent.datasetId, session);
  }
  if (policyRef.kind === "gap") {
    if (policyRef.reason.includes("on-demand") || policyRef.reason.includes("control")) {
      return 24 * 60 * 60_000;
    }
    if (policyRef.reason.includes("sync") || policyRef.reason.includes("intent")) {
      return 7 * 24 * 60 * 60_000;
    }
    return 60 * 60_000;
  }
  return 60 * 60_000;
}

function detectAnomalies(
  receivedAt: number | undefined,
  providerAsOf: number | undefined,
  now: number,
): TimestampAnomaly[] {
  const anomalies: TimestampAnomaly[] = [];
  if (receivedAt == null && providerAsOf == null) {
    anomalies.push("missing_anchor");
    return anomalies;
  }
  if (providerAsOf != null && providerAsOf > now + MAX_CLOCK_SKEW_MS) {
    anomalies.push("future_provider_timestamp");
  }
  if (
    receivedAt != null &&
    providerAsOf != null &&
    receivedAt + 1000 < providerAsOf
  ) {
    anomalies.push("received_before_provider");
  }
  if (
    providerAsOf != null &&
    receivedAt != null &&
    Math.abs(receivedAt - providerAsOf) > MAX_CLOCK_SKEW_MS &&
    providerAsOf <= now + MAX_CLOCK_SKEW_MS
  ) {
    anomalies.push("clock_skew");
  }
  return anomalies;
}

function freshnessAnchorFor(
  datasetId: DatasetId,
): "receivedAt" | "providerAsOf" {
  if (
    datasetId === "watchlist_quotes" ||
    datasetId === "chart_candles" ||
    datasetId === "options_chain" ||
    datasetId === "options_expirations"
  ) {
    return "receivedAt";
  }
  return "providerAsOf";
}

function evaluateCoverageAndAvailability(
  input: PolicyEvaluationInput,
  datasetId: DatasetId,
  session: MarketSessionKind,
): { availability: AvailabilityDimension; coverage: CoverageDimension; reasons: string[] } {
  const reasons: string[] = [];
  const skipped = input.skippedSymbols?.length ?? 0;
  const requested = input.requestedCount;
  const returned = input.returnedCount;
  const emptySemantics = emptySemanticsFor(datasetId);

  if (skipped > 0) {
    if (requested != null && returned != null && returned < requested) {
      reasons.push(`Partial coverage: ${returned}/${requested} (${skipped} skipped)`);
    } else {
      reasons.push(`Partial coverage: ${skipped} symbol(s) skipped`);
    }
    return { availability: "partial", coverage: "partial", reasons };
  }

  const isEmptyArray = returned === 0;
  const isEmpty = isEmptyArray || input.isNullPayload === true;

  if (isEmpty) {
    const holidayClosed =
      session === "closed" || isNyseFullDayHoliday(new Date(input.now ?? Date.now()));
    if (emptySemantics === "valid" || (emptySemantics === "contextual" && holidayClosed)) {
      reasons.push("Empty response is valid for this dataset/session");
      return { availability: "available", coverage: "empty", reasons };
    }
    reasons.push("Empty response is not valid for this dataset");
    return { availability: "unavailable", coverage: "empty", reasons };
  }

  return { availability: "available", coverage: "complete", reasons };
}

function ageToFreshness(ageMs: number, maxMs: number): FreshnessDimension {
  if (maxMs <= 0) return "unknown";
  if (ageMs <= maxMs * 0.5) return "current";
  if (ageMs <= maxMs) return "aging";
  return "stale";
}

/** Evaluate session/cadence-aware freshness, completeness, and quality for a catalog dataset. */
export function evaluateDatasetPolicy(
  input: PolicyEvaluationInput,
): PolicyEvaluationResult {
  const now = input.now ?? Date.now();
  const session = input.session ?? classifyUsEquitySession(now);
  const datasetId =
    resolveDatasetId(input.datasetId) ??
    (typeof input.datasetId === "string" ? (input.datasetId as DatasetId) : "chart_candles");

  const definition = lookupDataset(datasetId);
  const policyRef: FreshnessPolicyRef =
    definition?.freshnessPolicy ?? { kind: "gap", reason: "unknown dataset" };
  const policyKind = definition?.policyKind ?? (datasetId as DatasetKind);
  const cadence = cadenceForDataset(datasetId);
  const maxFreshnessMs = resolveMaxFreshnessMs(policyRef, datasetId, session);
  const anchorKind = freshnessAnchorFor(datasetId);
  const receivedAt = input.receivedAt;
  const providerAsOf = input.providerAsOf;
  const requiresAnchor = cadence !== "not_applicable";
  const missingAnchor =
    requiresAnchor && receivedAt == null && providerAsOf == null;
  const anchorTs =
    anchorKind === "receivedAt"
      ? receivedAt ?? providerAsOf
      : providerAsOf ?? receivedAt;
  const freshnessAgeMs =
    anchorTs == null ? Number.POSITIVE_INFINITY : Math.max(0, now - anchorTs);
  const anomalies = detectAnomalies(receivedAt, providerAsOf, now);
  const { availability, coverage, reasons: coverageReasons } =
    evaluateCoverageAndAvailability(input, datasetId, session);

  const reasons = [...coverageReasons];
  let freshness: FreshnessDimension = ageToFreshness(freshnessAgeMs, maxFreshnessMs);

  if (missingAnchor) {
    freshness = "unknown";
    reasons.push("missing_anchor");
  }
  if (anomalies.includes("future_provider_timestamp")) {
    freshness = "unknown";
    reasons.push("Provider timestamp is in the future");
  }

  const transportRelaxed =
    input.transportStale === true &&
    !missingAnchor &&
    (input.cacheTier === "hot-stale" || input.cacheTier === "hot-fresh") &&
    freshnessAgeMs <= maxFreshnessMs;

  const displayFresh =
    availability !== "unavailable" &&
    (freshness === "current" || freshness === "aging" || transportRelaxed);

  if (input.transportStale && displayFresh && freshness === "stale") {
    freshness = "aging";
  }

  return {
    datasetId,
    policyKind: definition?.policyKind,
    cadence,
    freshness,
    availability,
    coverage,
    freshnessAgeMs,
    freshnessAnchor: receivedAt != null || providerAsOf != null ? anchorKind : "unknown",
    maxFreshnessMs,
    displayFresh,
    anomalies,
    reasons,
  };
}

/** Map policy kind + provenance input to display freshness (compatibility shim). */
export function isPolicyDisplayFresh(
  dataset: DatasetKind,
  meta: {
    source?: string;
    asOf?: number;
    stale?: boolean;
    receivedAt?: number;
    lastUpdateAt?: number;
    cacheTier?: DataCacheTier;
    skippedSymbols?: string[];
    requestedCount?: number;
    returnedCount?: number;
  },
  now = Date.now(),
): boolean {
  const receivedAt = meta.receivedAt ?? meta.lastUpdateAt ?? meta.asOf;
  const result = evaluateDatasetPolicy({
    datasetId: dataset,
    receivedAt,
    providerAsOf: meta.asOf,
    transportStale: meta.stale,
    cacheTier: meta.cacheTier,
    skippedSymbols: meta.skippedSymbols,
    requestedCount: meta.requestedCount,
    returnedCount: meta.returnedCount,
    now,
  });
  return result.displayFresh;
}
