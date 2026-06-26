"use client";

import { useEffect, useState } from "react";
import {
  attachMarketDataTelemetryGlobal,
  exportMarketDataTelemetryJson,
  getMarketDataTelemetrySnapshot,
  isMarketDataTelemetryEnabled,
  subscribeMarketDataTelemetry,
  type MarketDataTelemetrySnapshot,
} from "@/lib/marketData/telemetry";

function formatMs(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}ms`;
}

export default function MarketDataTelemetryPanel() {
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sessionElapsedMs, setSessionElapsedMs] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<MarketDataTelemetrySnapshot>(() =>
    getMarketDataTelemetrySnapshot(),
  );

  useEffect(() => {
    setMounted(true);
    attachMarketDataTelemetryGlobal();
    const refresh = () => {
      const next = getMarketDataTelemetrySnapshot();
      setSnapshot(next);
      setSessionElapsedMs(Date.now() - next.sessionStartedAt);
    };
    refresh();
    return subscribeMarketDataTelemetry(refresh);
  }, []);

  if (!isMarketDataTelemetryEnabled() || !mounted) return null;

  const rows = Object.entries(snapshot.summary)
    .sort((a, b) => (b[1].lastMs ?? 0) - (a[1].lastMs ?? 0))
    .slice(0, 12);

  const traces = snapshot.traces.slice(0, 6);
  const recent = snapshot.events.slice(-6).reverse();

  return (
    <div
      className="pointer-events-auto fixed bottom-3 right-3 z-[9999] max-w-md rounded-lg border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]/95 text-[11px] text-[var(--edge-text-primary)] shadow-lg backdrop-blur"
      data-testid="market-data-telemetry-panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--edge-border)] px-3 py-2">
        <span className="font-medium">Market data latency</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-[var(--edge-surface-hover)]"
            onClick={() => window.__edgeMarketDataTelemetry?.dump()}
          >
            Log
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-[var(--edge-surface-hover)]"
            onClick={() => {
              const json = exportMarketDataTelemetryJson();
              void navigator.clipboard?.writeText(json);
            }}
          >
            Copy JSON
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-[var(--edge-surface-hover)]"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="max-h-80 overflow-auto px-3 py-2">
          <p className="mb-2 text-[var(--edge-text-secondary)]">
            Session {formatMs(sessionElapsedMs ?? undefined)} ·{" "}
            <code className="text-[10px]">__edgeMarketDataTelemetry.exportJson()</code>
          </p>
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
                {traces.map((trace) => (
                  <tr key={trace.traceId}>
                    <td className="py-0.5 pr-2 font-mono text-[10px]">
                      {trace.scenario ?? trace.traceId.slice(0, 18)}
                    </td>
                    <td className="py-0.5 pr-2">{formatMs(trace.totalClientMs)}</td>
                    <td className="py-0.5 pr-2">{formatMs(trace.totalServerMs)}</td>
                    <td className="py-0.5 font-mono text-[10px]">
                      {trace.slowestKind ? `${trace.slowestKind} ${formatMs(trace.slowestMs)}` : "—"}
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
                    <td className="py-0.5 pr-2">{formatMs(stats.lastMs)}</td>
                    <td className="py-0.5 pr-2">{formatMs(stats.p50Ms)}</td>
                    <td className="py-0.5">{stats.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="space-y-1 border-t border-[var(--edge-border)] pt-2">
            {recent.map((event) => (
              <div key={event.id} className="font-mono text-[10px] text-[var(--edge-text-secondary)]">
                +{formatMs(event.sinceSessionMs)} {event.kind}
                {event.detail?.clientMs != null
                  ? ` · ${formatMs(event.detail.clientMs as number)}`
                  : ""}
                {event.detail?.cacheTier ? ` · ${String(event.detail.cacheTier)}` : ""}
                {event.detail?.symbol ? ` · ${String(event.detail.symbol)}` : ""}
                {event.detail?.traceId ? ` · ${String(event.detail.traceId).slice(0, 16)}` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
