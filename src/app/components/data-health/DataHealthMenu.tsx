"use client";

import { useMemo, useState } from "react";
import type { Theme } from "@/lib/chartConfig";
import type { DataHealthDatasetRow, IbSocketHealthRow, ProviderHealthRow } from "@/lib/marketData/health";
import {
  buildDatasetChips,
  buildHealthCaveatSubtitle,
  shouldShowTwsRecovery,
  twsRecoveryButtonLabel,
} from "@/lib/marketData/health";
import ChartAnchoredPopover from "../chart-chrome/ChartAnchoredPopover";
import { menuSectionHeaderClass } from "../chart-chrome/headerStyles";
import DataHealthDatasetChips from "./DataHealthDatasetChips";
import DataHealthLatencySection from "./DataHealthLatencySection";
import HealthSeverityDot, { formatHealthEventAge } from "./HealthSeverityDot";
import TwsRecoverButton from "./TwsRecoverButton";
import { useDataHealth } from "./DataHealthProvider";

type Props = {
  theme: Theme;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

function providerStatusClass(status: ProviderHealthRow["status"]): string {
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

function ProviderRow({ provider }: { provider: ProviderHealthRow }) {
  return (
    <div
      className="flex items-start justify-between gap-2 text-[10px]"
      data-testid={`data-health-provider-${provider.id}`}
    >
      <span className="font-medium text-[var(--edge-text-primary)]">{provider.label}</span>
      <span className={`text-right ${providerStatusClass(provider.status)}`}>{provider.detail}</span>
    </div>
  );
}

function ConnectionRow({ row }: { row: IbSocketHealthRow }) {
  return (
    <div
      className="flex items-start justify-between gap-2 text-[10px]"
      data-testid={`data-health-connection-${row.id}`}
    >
      <span className="font-medium text-[var(--edge-text-primary)]">{row.label}</span>
      <span className={`text-right ${providerStatusClass(row.status)}`}>{row.detail}</span>
    </div>
  );
}

function DatasetRow({ row }: { row: DataHealthDatasetRow }) {
  if (row.status === "not_loaded") {
    return (
      <div
        className="text-[10px] text-[var(--edge-text-muted)]"
        data-testid={`data-health-dataset-${row.kind}`}
      >
        {row.label} · Not open
      </div>
    );
  }

  const chips = buildDatasetChips(row);

  return (
    <div data-testid={`data-health-dataset-${row.kind}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--edge-text-primary)]">
        {row.severity && row.status === "loaded" ? (
          <HealthSeverityDot severity={row.severity} />
        ) : (
          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--edge-text-muted)]/40" />
        )}
        <span>{row.label}</span>
      </div>
      <DataHealthDatasetChips chips={chips} />
    </div>
  );
}

export default function DataHealthMenu({ theme, anchorRef }: Props) {
  const {
    snapshot,
    menuOpen,
    setMenuOpen,
    serverHealthLoading,
    serverHealthLoaded,
    recoveringTws,
    recoverMessage,
    recoverTws,
  } = useDataHealth();
  const [providersExpanded, setProvidersExpanded] = useState(false);
  const [showAllProviders, setShowAllProviders] = useState(false);

  const twsProvider = snapshot.providers.find((provider) => provider.id === "tws");
  const showTwsRecovery = shouldShowTwsRecovery(twsProvider);
  const caveatSubtitle = buildHealthCaveatSubtitle(snapshot.datasets);
  const connectionSeverity =
    snapshot.providers.find((provider) => provider.id === "tws")?.status === "offline"
      ? "offline"
      : snapshot.severity;

  const showStatusBanner =
    snapshot.severity !== "healthy" || caveatSubtitle != null;
  const bannerToneClass =
    snapshot.severity === "offline"
      ? "border-[var(--edge-negative)]/30 bg-[var(--edge-negative)]/10"
      : "border-[var(--edge-warning)]/30 bg-[var(--edge-warning)]/10";

  const unhealthyProviders = useMemo(
    () => snapshot.providers.filter((provider) => provider.status !== "healthy"),
    [snapshot.providers],
  );
  const providersAutoExpand =
    snapshot.severity !== "healthy" || unhealthyProviders.length > 0;
  const providersVisible = providersAutoExpand || providersExpanded;
  const visibleProviders =
    providersAutoExpand && !showAllProviders && unhealthyProviders.length > 0
      ? unhealthyProviders
      : snapshot.providers;
  const hiddenHealthyCount = snapshot.providers.length - unhealthyProviders.length;

  const issueItems = useMemo(() => {
    const items: string[] = [];
    for (const warning of snapshot.recentWarnings) {
      items.push(warning);
    }
    for (const event of snapshot.recentEvents) {
      items.push(
        `${event.message}${event.recovered ? " · recovered" : ""} · ${formatHealthEventAge(event.at)}`,
      );
    }
    return items;
  }, [snapshot.recentEvents, snapshot.recentWarnings]);

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
      <div className="mb-2">
        <div className="text-sm font-medium text-[var(--edge-text-primary)]">Data Health</div>
        {showStatusBanner ? (
          <div
            className={`mt-1.5 rounded-[var(--edge-radius-sm)] border px-2 py-1.5 ${bannerToneClass}`}
            data-testid="data-health-status-banner"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--edge-text-primary)]">
              <HealthSeverityDot severity={connectionSeverity} size="md" />
              <span>{snapshot.connectionSummary}</span>
            </div>
            {caveatSubtitle ? (
              <div className="mt-0.5 text-[10px] text-[var(--edge-warning)]">{caveatSubtitle}</div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--edge-text-secondary)]">
              <HealthSeverityDot severity={connectionSeverity} size="md" />
              <span>{snapshot.connectionSummary}</span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--edge-text-secondary)]">
              All loaded datasets ready
            </div>
          </>
        )}
      </div>

      {showTwsRecovery ? (
        <div className="mb-3 space-y-1.5">
          <TwsRecoverButton
            testId="data-health-recover-tws"
            label={twsRecoveryButtonLabel(twsProvider)}
            recovering={recoveringTws}
            onClick={() => {
              void recoverTws();
            }}
          />
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

      {snapshot.connectionRows.length > 0 || snapshot.dataPreference ? (
        <div className="mb-3">
          <div className={menuSectionHeaderClass(theme)}>Connections</div>
          <div className="space-y-1.5">
            {snapshot.connectionRows.map((row) => (
              <ConnectionRow key={row.id} row={row} />
            ))}
            {snapshot.dataPreference ? (
              <div
                className="flex items-start justify-between gap-2 text-[10px]"
                data-testid="data-health-connection-preference"
              >
                <span className="font-medium text-[var(--edge-text-primary)]">
                  Chart data preference
                </span>
                <span className="text-right text-[var(--edge-text-secondary)]">
                  {snapshot.dataPreference.label}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={menuSectionHeaderClass(theme)}>Datasets</div>
      <div className="mb-3 space-y-2">
        {snapshot.datasets.map((row) => (
          <DatasetRow key={row.kind} row={row} />
        ))}
      </div>

      {snapshot.providers.length > 0 || (serverHealthLoading && !serverHealthLoaded) ? (
        <div className="mb-3">
          {providersAutoExpand ? (
            <div className={menuSectionHeaderClass(theme)}>Providers</div>
          ) : (
            <button
              type="button"
              className={`${menuSectionHeaderClass(theme)} flex w-full items-center gap-1 text-left hover:text-[var(--edge-text-primary)]`}
              onClick={() => setProvidersExpanded((value) => !value)}
              aria-expanded={providersVisible}
              data-testid="data-health-providers-toggle"
            >
              <span aria-hidden>{providersVisible ? "▾" : "▸"}</span>
              <span>Provider details</span>
            </button>
          )}
          {providersVisible ? (
            <div className="space-y-1.5">
              {serverHealthLoading && !serverHealthLoaded && snapshot.providers.length === 0 ? (
                <div
                  className="text-[10px] text-[var(--edge-text-secondary)]"
                  data-testid="data-health-providers-loading"
                >
                  Loading provider status…
                </div>
              ) : null}
              {visibleProviders.map((provider) => (
                <ProviderRow key={provider.id} provider={provider} />
              ))}
              {providersAutoExpand &&
              !showAllProviders &&
              hiddenHealthyCount > 0 &&
              unhealthyProviders.length > 0 ? (
                <button
                  type="button"
                  className="text-[10px] text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]"
                  onClick={() => setShowAllProviders(true)}
                  data-testid="data-health-show-all-providers"
                >
                  Show all providers ({hiddenHealthyCount} more)
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {issueItems.length > 0 ? (
        <>
          <div className={menuSectionHeaderClass(theme)}>Issues</div>
          <ul
            className="mb-3 space-y-1 text-[10px] text-[var(--edge-text-secondary)]"
            data-testid="data-health-issues"
          >
            {issueItems.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      <DataHealthLatencySection />

      <div className="mt-1 flex justify-end">
        <button
          type="button"
          className="text-[10px] text-[var(--edge-text-muted)] hover:text-[var(--edge-text-primary)]"
          onClick={() => {
            void navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2));
          }}
          data-testid="data-health-copy-json"
        >
          Copy health JSON
        </button>
      </div>
    </ChartAnchoredPopover>
  );
}
