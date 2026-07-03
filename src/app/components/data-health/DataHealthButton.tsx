"use client";

import { useRef } from "react";
import type { Theme } from "@/lib/chartConfig";
import type { DataHealthSeverity } from "@/lib/marketData/health";
import { buildHealthCompactSummary } from "@/lib/marketData/health";
import DataHealthMenu from "./DataHealthMenu";
import { useDataHealth } from "./DataHealthProvider";

function severityDotClass(severity: DataHealthSeverity): string {
  switch (severity) {
    case "healthy":
      return "bg-[var(--edge-positive)]";
    case "degraded":
      return "bg-[var(--edge-warning)]";
    case "offline":
      return "bg-[var(--edge-negative)]";
    default:
      return "bg-[var(--edge-text-muted)]";
  }
}

function severityRingClass(severity: DataHealthSeverity): string {
  switch (severity) {
    case "healthy":
      return "text-[var(--edge-text-muted)] ring-[var(--edge-border)]";
    case "degraded":
      return "text-[var(--edge-warning)] ring-[var(--edge-warning)]/30";
    case "offline":
      return "text-[var(--edge-negative)] ring-[var(--edge-negative)]/30";
    default:
      return "text-[var(--edge-text-muted)] ring-[var(--edge-border)]";
  }
}

type Props = {
  theme: Theme;
};

export default function DataHealthButton({ theme }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { snapshot, menuOpen, setMenuOpen } = useDataHealth();

  const compactLabel = buildHealthCompactSummary(
    snapshot.datasets.find((row) => row.kind === "chart"),
    snapshot.datasets.find((row) => row.kind === "watchlist"),
    snapshot.severity,
  );

  const title =
    snapshot.recentWarnings.length > 0
      ? snapshot.recentWarnings.join("; ")
      : `Data health: ${snapshot.severityLabel}`;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        data-testid="chart-data-source-badge"
        onClick={() => setMenuOpen(!menuOpen)}
        className={`edge-focus-ring inline-flex max-w-[9rem] items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 transition-colors hover:bg-[var(--edge-surface-hover)] ${severityRingClass(snapshot.severity)} ${menuOpen ? "bg-[var(--edge-surface-hover)]" : ""}`}
      >
        <span
          className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${severityDotClass(snapshot.severity)}`}
          aria-hidden
        />
        <span className="truncate">{compactLabel}</span>
      </button>
      <DataHealthMenu theme={theme} anchorRef={anchorRef} />
    </>
  );
}
