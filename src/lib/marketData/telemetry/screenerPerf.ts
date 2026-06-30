import type { MarketDataPerfPhase } from "./perfPhases";
import type { MarketDataTelemetrySnapshot } from "./types";

export type ScreenerPerfSummary = {
  traceId: string;
  scenario?: string;
  totalMs?: number;
  prefilterMs?: number;
  prefilterCandidates?: number;
  technicalMs?: number;
  technicalCandidates?: number;
  matched?: number;
  candleP50Ms?: number;
  candleP95Ms?: number;
  candleCacheHitPct?: number;
  indicatorCacheHitPct?: number;
  providerMix: Record<string, number>;
};

export type ScreenerPerfPresetResult = {
  presetId: string;
  variant: "cold" | "warm";
  traceId?: string;
  ok: boolean;
  totalMs: number;
  prefilterMs?: number;
  prefilterCandidates?: number;
  technicalMs?: number;
  matched?: number;
  candleP50Ms?: number;
  candleP95Ms?: number;
  candleCacheHitPct?: number;
  indicatorCacheHitPct?: number;
  providerMix?: Record<string, number>;
  rows?: number;
  error?: string;
};

function percentile(values: number[], p: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index];
}

function phaseDetailNumber(
  phase: MarketDataPerfPhase | undefined,
  key: string,
): number | undefined {
  const value = phase?.detail?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Derive screener KPIs from server perf phases emitted by getScreenerResults / runTechnicalFilter. */
export function deriveScreenerPerfFromPhases(
  phases: MarketDataPerfPhase[],
): Omit<ScreenerPerfSummary, "traceId" | "scenario"> {
  const prefilter = phases.find((phase) => phase.name === "screener.prefilter");
  const aggregate = phases.find((phase) => phase.name === "screener.technical.aggregate");
  const total = phases.find((phase) => phase.name === "screener.total");

  const candlePhases = phases.filter((phase) => phase.name === "screener.technical.candle");
  const candleMs = candlePhases.map((phase) => phase.ms);
  const candleCacheHits = candlePhases.filter((phase) => {
    const tier = phase.detail?.cacheTier;
    return tier === "hot-fresh" || tier === "hot-stale";
  }).length;

  const providerMix: Record<string, number> = {};
  for (const phase of candlePhases) {
    const source = typeof phase.detail?.source === "string" ? phase.detail.source : "unknown";
    providerMix[source] = (providerMix[source] ?? 0) + 1;
  }

  const candidates =
    phaseDetailNumber(aggregate, "candidates") ??
    phaseDetailNumber(prefilter, "candidates") ??
    candlePhases.length;
  const indicatorCacheHits = phaseDetailNumber(aggregate, "indicatorCacheHits") ?? 0;
  const candleCacheHitsFromAggregate = phaseDetailNumber(aggregate, "candleCacheHits");

  const resolvedCandleCacheHits = candleCacheHitsFromAggregate ?? candleCacheHits;

  return {
    totalMs: total?.ms,
    prefilterMs: prefilter?.ms,
    prefilterCandidates:
      phaseDetailNumber(prefilter, "candidates") ?? phaseDetailNumber(prefilter, "count"),
    technicalMs: aggregate?.ms,
    technicalCandidates: phaseDetailNumber(aggregate, "candidates"),
    matched: phaseDetailNumber(aggregate, "matched"),
    candleP50Ms: percentile(candleMs, 0.5),
    candleP95Ms: percentile(candleMs, 0.95),
    candleCacheHitPct:
      candidates > 0 ? Math.round((resolvedCandleCacheHits / candidates) * 100) : undefined,
    indicatorCacheHitPct:
      candidates > 0 ? Math.round((indicatorCacheHits / candidates) * 100) : undefined,
    providerMix,
  };
}

/** Build screener summaries from client telemetry events that carry serverPhases. */
export function deriveScreenerPerfSummaries(
  snapshot: MarketDataTelemetrySnapshot,
): ScreenerPerfSummary[] {
  const byTrace = new Map<string, ScreenerPerfSummary>();

  for (const event of snapshot.events) {
    if (event.kind !== "screener.fetch") continue;
    const traceId = event.detail?.traceId;
    const serverPhases = event.detail?.serverPhases;
    if (!traceId || !Array.isArray(serverPhases)) continue;

    const derived = deriveScreenerPerfFromPhases(serverPhases);
    byTrace.set(traceId, {
      traceId,
      scenario: typeof event.detail?.scenario === "string" ? event.detail.scenario : undefined,
      totalMs: typeof event.detail?.clientMs === "number" ? event.detail.clientMs : derived.totalMs,
      ...derived,
    });
  }

  return [...byTrace.values()].sort((a, b) => (b.totalMs ?? 0) - (a.totalMs ?? 0));
}

export function deriveScreenerPresetResult(
  presetId: string,
  variant: "cold" | "warm",
  phases: MarketDataPerfPhase[] | undefined,
  totalMs: number,
  rows: number,
  traceId?: string,
  ok = true,
  error?: string,
): ScreenerPerfPresetResult {
  const derived = phases ? deriveScreenerPerfFromPhases(phases) : null;
  return {
    presetId,
    variant,
    traceId,
    ok,
    totalMs,
    rows,
    error,
    prefilterMs: derived?.prefilterMs,
    prefilterCandidates: derived?.prefilterCandidates,
    technicalMs: derived?.technicalMs,
    matched: derived?.matched,
    candleP50Ms: derived?.candleP50Ms,
    candleP95Ms: derived?.candleP95Ms,
    candleCacheHitPct: derived?.candleCacheHitPct,
    indicatorCacheHitPct: derived?.indicatorCacheHitPct,
    providerMix: derived?.providerMix,
  };
}
