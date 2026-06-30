"use client";

import { useMemo, useState } from "react";
import {
  deriveScreenerPerfSummaries,
  exportMarketDataTelemetryJson,
  type MarketDataTelemetrySnapshot,
} from "@/lib/marketData/telemetry";

export function formatTelemetryMs(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}ms`;
}

type Props = {
  snapshot: MarketDataTelemetrySnapshot;
  sessionElapsedMs: number;
};

type ViewFilter = "all" | "screener";

function formatProviderMix(mix: Record<string, number>): string {
  const entries = Object.entries(mix);
  if (entries.length === 0) return "—";
  return entries.map(([source, count]) => `${source}:${count}`).join(", ");
}

export default function MarketDataLatencyDiagnosticsView({
  snapshot,
  sessionElapsedMs,
}: Props) {
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const screenerSummaries = useMemo(
    () => deriveScreenerPerfSummaries(snapshot),
    [snapshot],
  );

  const traces =
    viewFilter === "screener"
      ? snapshot.traces.filter(
          (trace) =>
            trace.scenario?.startsWith("screener.run") ||
            screenerSummaries.some((summary) => summary.traceId === trace.traceId),
        )
      : snapshot.traces;

  const rows = Object.entries(snapshot.summary)
    .filter(([kind]) => (viewFilter === "screener" ? kind.startsWith("screener") : true))
    .sort((a, b) => (b[1].lastMs ?? 0) - (a[1].lastMs ?? 0))
    .slice(0, 12);

  const recent = snapshot.events
    .filter((event) =>
      viewFilter === "screener" ? event.kind.startsWith("screener") : true,
    )
    .slice(-6)
    .reverse();

  return (
    <div className="text-[11px] text-[var(--edge-text-primary)]" data-testid="data-health-latency-diagnostics">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-[10px] ${
              viewFilter === "all"
                ? "bg-[var(--edge-surface-hover)]"
                : "hover:bg-[var(--edge-surface-hover)]"
            }`}
            onClick={() => setViewFilter("all")}
            data-testid="data-health-latency-filter-all"
          >
            All
          </button>
          <button
            type="button"
            className={`rounded px-2 py-0.5 text-[10px] ${
              viewFilter === "screener"
                ? "bg-[var(--edge-surface-hover)]"
                : "hover:bg-[var(--edge-surface-hover)]"
            }`}
            onClick={() => setViewFilter("screener")}
            data-testid="data-health-latency-filter-screener"
          >
            Screener
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded px-2 py-0.5 text-[10px] hover:bg-[var(--edge-surface-hover)]"
            onClick={() => window.__edgeMarketDataTelemetry?.dump()}
            data-testid="data-health-latency-log"
          >
            Log
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-[10px] hover:bg-[var(--edge-surface-hover)]"
            onClick={() => {
              const json = exportMarketDataTelemetryJson();
              void navigator.clipboard?.writeText(json);
            }}
            data-testid="data-health-latency-copy-json"
          >
            Copy latency JSON
          </button>
        </div>
      </div>
      <p className="mb-2 text-[var(--edge-text-secondary)]">
        Session {formatTelemetryMs(sessionElapsedMs)} ·{" "}
        <code className="text-[10px]">__edgeMarketDataTelemetry.exportJson()</code>
      </p>
      {viewFilter === "screener" && screenerSummaries.length > 0 ? (
        <table className="mb-3 w-full border-collapse" data-testid="screener-perf-table">
          <thead>
            <tr className="text-left text-[var(--edge-text-secondary)]">
              <th className="pb-1 pr-2 font-normal">Scenario</th>
              <th className="pb-1 pr-2 font-normal">Total</th>
              <th className="pb-1 pr-2 font-normal">Prefilter</th>
              <th className="pb-1 pr-2 font-normal">Technical</th>
              <th className="pb-1 pr-2 font-normal">Candle p50</th>
              <th className="pb-1 pr-2 font-normal">Cache</th>
              <th className="pb-1 font-normal">Providers</th>
            </tr>
          </thead>
          <tbody>
            {screenerSummaries.slice(0, 6).map((summary) => (
              <tr key={summary.traceId}>
                <td className="py-0.5 pr-2 font-mono text-[10px]">
                  {summary.scenario?.replace("screener.run:", "") ?? summary.traceId.slice(0, 12)}
                </td>
                <td className="py-0.5 pr-2">{formatTelemetryMs(summary.totalMs)}</td>
                <td className="py-0.5 pr-2">
                  {formatTelemetryMs(summary.prefilterMs)}
                  {summary.prefilterCandidates != null ? ` (${summary.prefilterCandidates})` : ""}
                </td>
                <td className="py-0.5 pr-2">
                  {formatTelemetryMs(summary.technicalMs)}
                  {summary.matched != null ? ` (${summary.matched})` : ""}
                </td>
                <td className="py-0.5 pr-2">{formatTelemetryMs(summary.candleP50Ms)}</td>
                <td className="py-0.5 pr-2">
                  {summary.candleCacheHitPct != null ? `${summary.candleCacheHitPct}%` : "—"} /{" "}
                  {summary.indicatorCacheHitPct != null ? `${summary.indicatorCacheHitPct}%` : "—"}
                </td>
                <td className="py-0.5 font-mono text-[10px]">
                  {formatProviderMix(summary.providerMix)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {traces.length > 0 ? (
        <table className="mb-3 w-full border-collapse">
          <thead>
            <tr className="text-left text-[var(--edge-text-secondary)]">
              <th className="pb-1 pr-2 font-normal">Trace</th>
              <th className="pb-1 pr-2 font-normal">Client</th>
              <th className="pb-1 pr-2 font-normal">Server</th>
              <th className="pb-1 font-normal">Slowest</th>
            </tr>
          </thead>
          <tbody>
            {traces.slice(0, 6).map((trace) => (
              <tr key={trace.traceId}>
                <td className="py-0.5 pr-2 font-mono text-[10px]">
                  {trace.scenario ?? trace.traceId.slice(0, 18)}
                </td>
                <td className="py-0.5 pr-2">{formatTelemetryMs(trace.totalClientMs)}</td>
                <td className="py-0.5 pr-2">{formatTelemetryMs(trace.totalServerMs)}</td>
                <td className="py-0.5 font-mono text-[10px]">
                  {trace.slowestKind
                    ? `${trace.slowestKind} ${formatTelemetryMs(trace.slowestMs)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <table className="mb-3 w-full border-collapse">
        <thead>
          <tr className="text-left text-[var(--edge-text-secondary)]">
            <th className="pb-1 pr-2 font-normal">Kind</th>
            <th className="pb-1 pr-2 font-normal">Last</th>
            <th className="pb-1 pr-2 font-normal">p50</th>
            <th className="pb-1 font-normal">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-2 text-[var(--edge-text-secondary)]">
                Waiting for requests…
              </td>
            </tr>
          ) : (
            rows.map(([kind, stats]) => (
              <tr key={kind}>
                <td className="py-0.5 pr-2 font-mono">{kind}</td>
                <td className="py-0.5 pr-2">{formatTelemetryMs(stats.lastMs)}</td>
                <td className="py-0.5 pr-2">{formatTelemetryMs(stats.p50Ms)}</td>
                <td className="py-0.5">{stats.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="space-y-1 border-t border-[var(--edge-border)] pt-2">
        {recent.map((event) => (
          <div key={event.id} className="font-mono text-[10px] text-[var(--edge-text-secondary)]">
            +{formatTelemetryMs(event.sinceSessionMs)} {event.kind}
            {event.detail?.clientMs != null
              ? ` · ${formatTelemetryMs(event.detail.clientMs as number)}`
              : ""}
            {event.detail?.cacheTier ? ` · ${String(event.detail.cacheTier)}` : ""}
            {event.detail?.symbol ? ` · ${String(event.detail.symbol)}` : ""}
            {event.detail?.traceId ? ` · ${String(event.detail.traceId).slice(0, 16)}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __edgeMarketDataTelemetry?: {
      snapshot: () => MarketDataTelemetrySnapshot;
      dump: () => void;
      exportJson: () => string;
      clear: () => void;
    };
  }
}
