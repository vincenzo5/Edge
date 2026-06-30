"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  attachMarketDataTelemetryGlobal,
  getMarketDataTelemetrySnapshot,
  isMarketDataTelemetryEnabled,
  subscribeMarketDataTelemetry,
  type MarketDataTelemetrySnapshot,
} from "@/lib/marketData/telemetry";
import MarketDataLatencyDiagnosticsView from "../data-health/MarketDataLatencyDiagnosticsView";

/** @deprecated Fixed overlay removed — latency diagnostics live in Data Health menu. Kept for testable view wiring. */
export default function MarketDataTelemetryPanel() {
  const [open, setOpen] = useState(true);
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

  if (!enabled || !mounted) return null;

  const sessionElapsedMs = Date.now() - snapshot.sessionStartedAt;

  return (
    <MarketDataTelemetryPanelView
      open={open}
      setOpen={setOpen}
      snapshot={snapshot}
      sessionElapsedMs={sessionElapsedMs}
    />
  );
}

type MarketDataTelemetryPanelViewProps = {
  open: boolean;
  setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  snapshot: MarketDataTelemetrySnapshot;
  sessionElapsedMs: number;
};

export function MarketDataTelemetryPanelView({
  open,
  setOpen,
  snapshot,
  sessionElapsedMs,
}: MarketDataTelemetryPanelViewProps) {
  return (
    <div
      className="pointer-events-auto fixed bottom-3 right-3 z-[9999] max-w-md rounded-lg border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]/95 text-[11px] text-[var(--edge-text-primary)] shadow-lg backdrop-blur"
      data-testid="market-data-telemetry-panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--edge-border)] px-3 py-2">
        <span className="font-medium">Market data latency</span>
        <button
          type="button"
          className="rounded px-2 py-0.5 hover:bg-[var(--edge-surface-hover)]"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <div className="max-h-80 overflow-auto px-3 py-2">
          <MarketDataLatencyDiagnosticsView snapshot={snapshot} sessionElapsedMs={sessionElapsedMs} />
        </div>
      ) : null}
    </div>
  );
}
