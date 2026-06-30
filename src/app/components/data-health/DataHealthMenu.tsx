"use client";

import type { Theme } from "@/lib/chartConfig";
import type { DataHealthSeverity } from "@/lib/marketData/health";
import {
  formatDatasetLine,
  shouldShowTwsRecovery,
  twsRecoveryButtonLabel,
} from "@/lib/marketData/health";
import ChartAnchoredPopover from "../chart-chrome/ChartAnchoredPopover";
import { menuSectionHeaderClass } from "../chart-chrome/headerStyles";
import DataHealthLatencySection from "./DataHealthLatencySection";
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

function providerStatusClass(status: string): string {
  switch (status) {
    case "healthy":
      return "text-[var(--edge-positive)]";
    case "degraded":
      return "text-[var(--edge-warning)]";
    case "offline":
      return "text-[var(--edge-negative)]";
    default:
      return "text-[var(--edge-text-muted)]";
  }
}

type Props = {
  theme: Theme;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

export default function DataHealthMenu({ theme, anchorRef }: Props) {
  const { snapshot, menuOpen, setMenuOpen, recoveringTws, recoverMessage, recoverTws } =
    useDataHealth();
  const twsProvider = snapshot.providers.find((provider) => provider.id === "tws");
  const showTwsRecovery = shouldShowTwsRecovery(twsProvider);

  return (
    <ChartAnchoredPopover
      open={menuOpen}
      anchorRef={anchorRef}
      theme={theme}
      onClose={() => setMenuOpen(false)}
      align="end"
      minWidth={320}
      className="px-3 py-2"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-[var(--edge-text-primary)]">Data Health</div>
          <div className="text-[11px] text-[var(--edge-text-secondary)]">
            Status: {snapshot.severityLabel}
          </div>
        </div>
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${severityDotClass(snapshot.severity)}`}
          aria-hidden
        />
      </div>

      <div className={menuSectionHeaderClass(theme)}>Datasets</div>
      <div className="mb-3 space-y-2">
        {snapshot.datasets.map((row) => (
          <div key={row.kind} data-testid={`data-health-dataset-${row.kind}`}>
            <div className="text-[11px] font-medium text-[var(--edge-text-primary)]">
              {row.label}
            </div>
            <div className="text-[10px] text-[var(--edge-text-secondary)]">
              {row.status === "not_loaded"
                ? "Not loaded"
                : row.status === "loading"
                  ? "Loading…"
                  : formatDatasetLine(row) || row.detail || "—"}
            </div>
          </div>
        ))}
      </div>

      <div className={menuSectionHeaderClass(theme)}>Provider Status</div>
      <div className="mb-3 space-y-1.5">
        {snapshot.providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-start justify-between gap-2 text-[10px]"
            data-testid={`data-health-provider-${provider.id}`}
          >
            <span className="font-medium text-[var(--edge-text-primary)]">{provider.label}</span>
            <span className={`text-right ${providerStatusClass(provider.status)}`}>
              {provider.detail}
            </span>
          </div>
        ))}
      </div>

      {snapshot.recentWarnings.length > 0 ? (
        <>
          <div className={menuSectionHeaderClass(theme)}>Recent Fallbacks</div>
          <ul
            className="mb-3 space-y-1 text-[10px] text-[var(--edge-text-secondary)]"
            data-testid="data-health-warnings"
          >
            {snapshot.recentWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      ) : null}

      <DataHealthLatencySection />

      {showTwsRecovery ? (
        <div className="mb-3 space-y-1.5">
          <button
            type="button"
            className="w-full rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] px-2 py-1.5 text-[11px] font-medium text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              void recoverTws();
            }}
            disabled={recoveringTws}
            data-testid="data-health-recover-tws"
          >
            {recoveringTws ? "Recovering TWS…" : twsRecoveryButtonLabel(twsProvider)}
          </button>
          {recoverMessage ? (
            <div
              className="text-[10px] text-[var(--edge-text-secondary)]"
              data-testid="data-health-recover-message"
            >
              {recoverMessage}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="w-full rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] px-2 py-1.5 text-[11px] text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]"
        onClick={() => {
          void navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2));
        }}
        data-testid="data-health-copy-json"
      >
        Copy health JSON
      </button>
    </ChartAnchoredPopover>
  );
}
