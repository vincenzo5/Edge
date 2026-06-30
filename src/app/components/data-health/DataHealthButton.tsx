"use client";

import { useRef } from "react";
import type { Theme } from "@/lib/chartConfig";
import type { DataHealthSeverity } from "@/lib/marketData/health";
import ChartHeaderButton from "../chart-chrome/ChartHeaderButton";
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

type Props = {
  theme: Theme;
};

export default function DataHealthButton({ theme }: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { snapshot, menuOpen, setMenuOpen } = useDataHealth();

  const title =
    snapshot.recentWarnings.length > 0
      ? snapshot.recentWarnings.join("; ")
      : `Data health: ${snapshot.severityLabel}`;

  return (
    <>
      <ChartHeaderButton
        ref={anchorRef}
        theme={theme}
        title={title}
        active={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        data-testid="chart-data-source-badge"
      >
        <span
          className={`mr-1 inline-flex h-1.5 w-1.5 rounded-full ${severityDotClass(snapshot.severity)}`}
          aria-hidden
        />
        <span className="max-w-[9rem] truncate text-[10px] font-medium uppercase tracking-wide">
          {snapshot.summary}
        </span>
      </ChartHeaderButton>
      <DataHealthMenu theme={theme} anchorRef={anchorRef} />
    </>
  );
}
