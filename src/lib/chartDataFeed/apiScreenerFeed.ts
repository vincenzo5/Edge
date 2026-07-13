import type { FmpMarketMover } from "@/lib/marketData/contracts/fmp";
import type { FmpMarketMoverKind } from "@/lib/marketData/contracts/fmp";
import type { ScreenQuery } from "@/lib/marketData/schemas/request";
import type { ScreenerMeta, ScreenerResultRow } from "@/lib/screener/types";
import { parseScreenerPhases } from "@/lib/screener/types";
import type { MarketDataPerfPhase } from "@/lib/marketData/telemetry";
import {
  createMarketDataTraceId,
  isMarketDataTelemetryEnabled,
  marketDataTraceHeaders,
  recordMarketDataTelemetry,
} from "@/lib/marketData/telemetry";

function moverToScreenerRow(mover: FmpMarketMover): ScreenerResultRow {
  return {
    symbol: mover.symbol,
    name: mover.name,
    price: mover.price,
    change: mover.change,
    changePercent: mover.changePercent,
    exchange: mover.exchange,
    volume: mover.volume,
    sector: mover.sector ?? null,
    industry: mover.industry ?? null,
    country: mover.country ?? null,
    beta: mover.beta ?? null,
    marketCap: mover.marketCap ?? null,
    dividendYield: mover.dividendYield ?? null,
  };
}

function parseIndicatorValues(raw: unknown): Record<string, Record<string, number>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, Record<string, number>> = {};
  for (const [symbol, values] of Object.entries(raw as Record<string, unknown>)) {
    if (!values || typeof values !== "object") continue;
    const metrics: Record<string, number> = {};
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        metrics[key] = value;
      }
    }
    if (Object.keys(metrics).length > 0) {
      out[symbol.trim().toUpperCase()] = metrics;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseMeta(raw: unknown): ScreenerMeta & { traceId?: string; phasesRaw?: MarketDataPerfPhase[] } {
  const meta = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const phasesRaw = Array.isArray(meta.phases)
    ? (meta.phases as MarketDataPerfPhase[])
    : undefined;
  return {
    source: typeof meta.source === "string" ? meta.source : "unknown",
    warnings: Array.isArray(meta.warnings)
      ? meta.warnings.filter((warning): warning is string => typeof warning === "string")
      : [],
    skippedSymbols: Array.isArray(meta.skippedSymbols)
      ? meta.skippedSymbols.filter((symbol): symbol is string => typeof symbol === "string")
      : [],
    stale: meta.stale === true,
    asOf: typeof meta.asOf === "number" ? meta.asOf : undefined,
    latencyMs: typeof meta.latencyMs === "number" ? meta.latencyMs : undefined,
    phases: parseScreenerPhases(meta.phases),
    indicatorValues: parseIndicatorValues(meta.indicatorValues),
    traceId: typeof meta.traceId === "string" ? meta.traceId : undefined,
    phasesRaw,
  };
}

export async function fetchScreenerResults(
  query: ScreenQuery,
): Promise<{ rows: ScreenerResultRow[]; meta: ScreenerMeta }> {
  const scenario = query.technical
    ? `screener.run:technical:${query.technical.kind}`
    : "screener.run:prefilter";
  const traceId = createMarketDataTraceId(scenario);
  const startedAt = Date.now();
  const res = await fetch("/api/screener/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...marketDataTraceHeaders(traceId, scenario),
    },
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Screener request failed (${res.status})`);
  }
  const json = (await res.json()) as { results?: ScreenerResultRow[]; meta?: unknown };
  const parsedMeta = parseMeta(json.meta);
  if (isMarketDataTelemetryEnabled()) {
    recordMarketDataTelemetry("screener.fetch", {
      traceId: parsedMeta.traceId ?? traceId,
      scenario,
      layer: "client",
      ok: true,
      clientMs: Date.now() - startedAt,
      durationMs: Date.now() - startedAt,
      serverMs: parsedMeta.latencyMs,
      provider: parsedMeta.source,
      source: parsedMeta.source,
      serverPhases: parsedMeta.phasesRaw,
      count: Array.isArray(json.results) ? json.results.length : 0,
    });
  }
  return {
    rows: Array.isArray(json.results) ? json.results : [],
    meta: {
      source: parsedMeta.source,
      warnings: parsedMeta.warnings,
      skippedSymbols: parsedMeta.skippedSymbols,
      stale: parsedMeta.stale,
      asOf: parsedMeta.asOf,
      latencyMs: parsedMeta.latencyMs,
      phases: parsedMeta.phases,
      indicatorValues: parsedMeta.indicatorValues,
    },
  };
}

export async function fetchMarketMoverResults(args: {
  kind: FmpMarketMoverKind;
  limit?: number;
}): Promise<{ rows: ScreenerResultRow[]; meta: ScreenerMeta }> {
  const params = new URLSearchParams({
    kind: args.kind,
    limit: String(args.limit ?? 50),
  });
  const res = await fetch(`/api/market-data/fmp/movers?${params.toString()}`);
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Market movers request failed (${res.status})`);
  }
  const json = (await res.json()) as { movers?: FmpMarketMover[]; meta?: unknown };
  const movers = Array.isArray(json.movers) ? json.movers : [];
  return {
    rows: movers.map(moverToScreenerRow),
    meta: parseMeta(json.meta),
  };
}
