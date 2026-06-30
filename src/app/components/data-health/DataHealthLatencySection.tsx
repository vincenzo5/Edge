"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  attachMarketDataTelemetryGlobal,
  getMarketDataTelemetrySnapshot,
  isMarketDataTelemetryEnabled,
  subscribeMarketDataTelemetry,
} from "@/lib/marketData/telemetry";
import MarketDataLatencyDiagnosticsView, {
  formatTelemetryMs,
} from "./MarketDataLatencyDiagnosticsView";

export default function DataHealthLatencySection() {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const enabled = isMarketDataTelemetryEnabled();

  const snapshot = useSyncExternalStore(
    subscribeMarketDataTelemetry,
    getMarketDataTelemetrySnapshot,
    getMarketDataTelemetrySnapshot,
  );

  useEffect(() => {
    if (!enabled) return;
    setMounted(true);
    attachMarketDataTelemetryGlobal();
  }, [enabled]);

  const summaryHint = useMemo(() => {
    const entries = Object.entries(snapshot.summary);
    if (entries.length === 0) return null;
    const [topKind, topStats] = entries.sort(
      (a, b) => (b[1].lastMs ?? 0) - (a[1].lastMs ?? 0),
    )[0];
    if (topStats.lastMs == null) return null;
    return `${topKind} ${formatTelemetryMs(topStats.lastMs)}`;
  }, [snapshot.summary]);

  if (!enabled || !mounted) return null;

  const sessionElapsedMs = Date.now() - snapshot.sessionStartedAt;

  return (
    <div className="mb-3" data-testid="data-health-latency-section">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] px-2 py-1.5 text-left hover:bg-[var(--edge-surface-hover)]"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        data-testid="data-health-latency-toggle"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[var(--edge-text-primary)]">
          <span aria-hidden>{expanded ? "▾" : "▸"}</span>
          <span>Latency Diagnostics</span>
          <span className="text-[10px] font-normal text-[var(--edge-text-muted)]">dev-only</span>
        </span>
        {summaryHint && !expanded ? (
          <span className="truncate text-[10px] text-[var(--edge-text-secondary)]">{summaryHint}</span>
        ) : null}
      </button>
      {expanded ? (
        <div className="mt-2 max-h-72 overflow-auto rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] px-2 py-2">
          <MarketDataLatencyDiagnosticsView
            snapshot={snapshot}
            sessionElapsedMs={sessionElapsedMs}
          />
        </div>
      ) : null}
    </div>
  );
}
