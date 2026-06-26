import type {
  MarketDataTelemetryEvent,
  MarketDataTelemetryEventDetail,
  MarketDataTelemetryKindStats,
  MarketDataTelemetrySnapshot,
  MarketDataTelemetryTraceSummary,
} from "./types";
import { isMarketDataTelemetryEnabled } from "./isEnabled";

const MAX_EVENTS = 250;

let sessionStartedAt = Date.now();
let nextId = 0;
let events: MarketDataTelemetryEvent[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function percentile(values: number[], p: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index];
}

function eventDurationMs(detail?: MarketDataTelemetryEventDetail): number | undefined {
  if (!detail) return undefined;
  if (typeof detail.clientMs === "number") return detail.clientMs;
  if (typeof detail.serverMs === "number") return detail.serverMs;
  if (typeof detail.durationMs === "number") return detail.durationMs;
  if (typeof detail.ms === "number") return detail.ms;
  return undefined;
}

function buildKindSummary(
  rows: MarketDataTelemetryEvent[],
): Record<string, MarketDataTelemetryKindStats> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const ms = eventDurationMs(row.detail) ?? row.sinceSessionMs;
    const list = buckets.get(row.kind) ?? [];
    list.push(ms);
    buckets.set(row.kind, list);
  }

  const summary: Record<string, MarketDataTelemetryKindStats> = {};
  for (const [kind, values] of buckets) {
    summary[kind] = {
      count: values.length,
      lastMs: values[values.length - 1],
      p50Ms: percentile(values, 0.5),
    };
  }
  return summary;
}

function buildGroupedSummary(
  rows: MarketDataTelemetryEvent[],
  pickKey: (detail?: MarketDataTelemetryEventDetail) => string | undefined,
): Record<string, MarketDataTelemetryKindStats> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const key = pickKey(row.detail);
    if (!key) continue;
    const ms = eventDurationMs(row.detail);
    if (ms == null) continue;
    const list = buckets.get(key) ?? [];
    list.push(ms);
    buckets.set(key, list);
  }

  const summary: Record<string, MarketDataTelemetryKindStats> = {};
  for (const [key, values] of buckets) {
    summary[key] = {
      count: values.length,
      lastMs: values[values.length - 1],
      p50Ms: percentile(values, 0.5),
    };
  }
  return summary;
}

function buildTraceSummaries(rows: MarketDataTelemetryEvent[]): MarketDataTelemetryTraceSummary[] {
  const byTrace = new Map<string, MarketDataTelemetryEvent[]>();
  for (const row of rows) {
    const traceId = row.detail?.traceId;
    if (!traceId) continue;
    const list = byTrace.get(traceId) ?? [];
    list.push(row);
    byTrace.set(traceId, list);
  }

  const traces: MarketDataTelemetryTraceSummary[] = [];
  for (const [traceId, traceEvents] of byTrace) {
    const sorted = [...traceEvents].sort((a, b) => a.at - b.at);
    let totalClientMs = 0;
    let totalServerMs = 0;
    let slowestKind: string | undefined;
    let slowestMs = -1;

    for (const event of sorted) {
      const clientMs = event.detail?.clientMs;
      const serverMs = event.detail?.serverMs;
      if (typeof clientMs === "number") totalClientMs += clientMs;
      if (typeof serverMs === "number") totalServerMs += serverMs;
      const duration = eventDurationMs(event.detail);
      if (duration != null && duration > slowestMs) {
        slowestMs = duration;
        slowestKind = event.kind;
      }
    }

    const last = sorted[sorted.length - 1];
    traces.push({
      traceId,
      scenario: sorted.find((event) => event.detail?.scenario)?.detail?.scenario,
      eventCount: sorted.length,
      startedAt: sorted[0]?.at ?? 0,
      lastAt: last?.at ?? 0,
      totalClientMs: totalClientMs > 0 ? totalClientMs : undefined,
      totalServerMs: totalServerMs > 0 ? totalServerMs : undefined,
      slowestKind,
      slowestMs: slowestMs >= 0 ? slowestMs : undefined,
      cacheTier: last?.detail?.cacheTier,
      provider: last?.detail?.provider ?? last?.detail?.source,
    });
  }

  return traces.sort((a, b) => b.lastAt - a.lastAt);
}

function buildSlowestEvents(rows: MarketDataTelemetryEvent[], limit = 12): MarketDataTelemetryEvent[] {
  return [...rows]
    .sort((a, b) => (eventDurationMs(b.detail) ?? 0) - (eventDurationMs(a.detail) ?? 0))
    .slice(0, limit);
}

export function resetMarketDataTelemetry(now = Date.now()): void {
  sessionStartedAt = now;
  nextId = 0;
  events = [];
  notify();
}

export function subscribeMarketDataTelemetry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordMarketDataTelemetry(
  kind: string,
  detail?: MarketDataTelemetryEventDetail,
): MarketDataTelemetryEvent | null {
  if (!isMarketDataTelemetryEnabled()) return null;
  const at = Date.now();
  const event: MarketDataTelemetryEvent = {
    id: `mdt-${++nextId}`,
    at,
    sinceSessionMs: at - sessionStartedAt,
    kind,
    detail,
  };
  events = [...events, event].slice(-MAX_EVENTS);
  notify();
  return event;
}

export function getMarketDataTelemetrySnapshot(): MarketDataTelemetrySnapshot {
  return {
    sessionStartedAt,
    events: [...events],
    summary: buildKindSummary(events),
    traces: buildTraceSummaries(events),
    byProvider: buildGroupedSummary(events, (detail) =>
      typeof detail?.provider === "string"
        ? detail.provider
        : typeof detail?.source === "string"
          ? detail.source
          : undefined,
    ),
    byCacheTier: buildGroupedSummary(events, (detail) =>
      typeof detail?.cacheTier === "string" ? detail.cacheTier : undefined,
    ),
    slowestEvents: buildSlowestEvents(events),
  };
}

export async function measureMarketDataTelemetry<T>(
  kind: string,
  fn: () => Promise<T>,
  detail?: MarketDataTelemetryEventDetail,
): Promise<T> {
  if (!isMarketDataTelemetryEnabled()) {
    return fn();
  }
  const startedAt = Date.now();
  try {
    const result = await fn();
    recordMarketDataTelemetry(kind, {
      ...detail,
      clientMs: Date.now() - startedAt,
      durationMs: Date.now() - startedAt,
      ok: true,
    });
    return result;
  } catch (error) {
    recordMarketDataTelemetry(kind, {
      ...detail,
      clientMs: Date.now() - startedAt,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function exportMarketDataTelemetryJson(): string {
  return JSON.stringify(getMarketDataTelemetrySnapshot(), null, 2);
}

export function attachMarketDataTelemetryGlobal(): void {
  if (typeof window === "undefined" || !isMarketDataTelemetryEnabled()) return;
  const globalObj = window as Window & {
    __edgeMarketDataTelemetry?: {
      snapshot: () => MarketDataTelemetrySnapshot;
      dump: () => void;
      exportJson: () => string;
      clear: () => void;
    };
  };
  globalObj.__edgeMarketDataTelemetry = {
    snapshot: getMarketDataTelemetrySnapshot,
    dump: () => {
      const snap = getMarketDataTelemetrySnapshot();
      console.group("[edge] market data telemetry");
      console.table(snap.summary);
      console.table(
        snap.traces.map((trace) => ({
          traceId: trace.traceId,
          scenario: trace.scenario,
          events: trace.eventCount,
          clientMs: trace.totalClientMs,
          serverMs: trace.totalServerMs,
          slowest: trace.slowestKind,
          slowestMs: trace.slowestMs,
        })),
      );
      console.table(
        snap.events.slice(-40).map((row) => ({
          t: row.sinceSessionMs,
          kind: row.kind,
          traceId: row.detail?.traceId,
          ...row.detail,
        })),
      );
      console.groupEnd();
    },
    exportJson: exportMarketDataTelemetryJson,
    clear: resetMarketDataTelemetry,
  };
}
