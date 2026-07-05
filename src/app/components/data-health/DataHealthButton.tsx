"use client";

import { useRef } from "react";
import type { Theme } from "@/lib/chartConfig";
import { buildHealthBadgeLabel } from "@/lib/marketData/health";
import Tooltip from "../Tooltip";
import DataHealthMenu from "./DataHealthMenu";
import HealthSeverityDot, { severityRingClass } from "./HealthSeverityDot";
import { useDataHealth } from "./DataHealthProvider";
import { useMarketDataQuotes } from "../MarketDataProvider";

type Props = {
  theme: Theme;
  /** @deprecated Session label removed from chart chrome; kept for call-site compatibility */
  marketSessionLabel?: string | null;
  /** @deprecated No longer renders session label */
  showMarketStatus?: boolean;
};

export default function DataHealthButton({
  theme,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { snapshot, menuOpen, setMenuOpen } = useDataHealth();
  const marketData = useMarketDataQuotes();

  const chartRow = snapshot.datasets.find((row) => row.kind === "chart");
  const watchlistRow = snapshot.datasets.find((row) => row.kind === "watchlist");

  const compactLabel = buildHealthBadgeLabel(
    chartRow,
    watchlistRow,
    snapshot.severity,
    marketData?.quotesTransport,
  );

  const titleParts = [snapshot.connectionSummary];
  if (snapshot.recentWarnings.length > 0) {
    titleParts.push(snapshot.recentWarnings.join("; "));
  } else if (snapshot.severity !== "healthy") {
    titleParts.push(`Data health: ${snapshot.severityLabel}`);
  }
  const title = titleParts.join(" · ");

  return (
    <>
      <Tooltip content={compactLabel} theme={theme} side="left" portaled>
        <button
          ref={anchorRef}
          type="button"
          title={title}
          aria-label={title}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="chart-data-source-badge"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`edge-focus-ring inline-flex items-stretch overflow-hidden rounded bg-[var(--edge-surface-panel)] ring-1 transition-colors hover:bg-[var(--edge-surface-hover)] ${severityRingClass(snapshot.severity)} ${menuOpen ? "bg-[var(--edge-surface-hover)]" : ""}`}
        >
          <span className="flex items-center px-1.5 py-0.5">
            <HealthSeverityDot severity={snapshot.severity} size="md" />
          </span>
        </button>
      </Tooltip>
      <DataHealthMenu theme={theme} anchorRef={anchorRef} />
    </>
  );
}
