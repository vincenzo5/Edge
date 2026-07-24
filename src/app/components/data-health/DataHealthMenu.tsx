"use client";

import type { Theme } from "@/lib/chartConfig";
import type { DataHealthDatasetRow } from "@/lib/marketData/health";
import type { ProjectedConnectionRow } from "@/lib/marketData/healthProjection";
import ChartAnchoredPopover from "../chart-chrome/ChartAnchoredPopover";
import { menuSectionHeaderClass } from "../chart-chrome/headerStyles";
import DataHealthDatasetChips from "./DataHealthDatasetChips";
import DataHealthDiagnosticsSection from "./DataHealthDiagnosticsSection";
import HealthSeverityDot from "./HealthSeverityDot";
import TwsRecoverButton from "./TwsRecoverButton";
import { useDataHealth } from "./DataHealthProvider";
import { buildDatasetChips } from "@/lib/marketData/health";

type Props = {
  theme: Theme;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

function ConnectionRow({ row }: { row: ProjectedConnectionRow }) {
  return (
    <div
      className="flex items-start justify-between gap-2 text-[10px]"
      data-testid={`data-health-connection-${row.id}`}
    >
      <span className="font-medium text-[var(--edge-text-primary)]">{row.label}</span>
      <span className="text-right text-[var(--edge-text-secondary)]">{row.userDetail}</span>
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

  const projection = snapshot.projection;
  const showStatusBanner =
    projection.severity !== "healthy" ||
    projection.caveatSubtitle != null ||
    projection.sessionSubtitle != null;
  const bannerToneClass =
    projection.severity === "offline"
      ? "border-[var(--edge-negative)]/30 bg-[var(--edge-negative)]/10"
      : projection.caveatSubtitle != null
        ? "border-[var(--edge-warning)]/30 bg-[var(--edge-warning)]/10"
        : "border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)]/40";

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
              <HealthSeverityDot severity={projection.severity} size="md" />
              <span>{projection.primaryLabel}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--edge-text-secondary)]">
              {projection.connectionSummary}
            </div>
            {projection.caveatSubtitle ? (
              <div className="mt-0.5 text-[10px] text-[var(--edge-warning)]">
                {projection.caveatSubtitle}
              </div>
            ) : null}
            {projection.sessionSubtitle ? (
              <div
                className="mt-0.5 text-[10px] text-[var(--edge-text-secondary)]"
                data-testid="data-health-session-subtitle"
              >
                {projection.sessionSubtitle}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--edge-text-secondary)]">
              <HealthSeverityDot severity={projection.severity} size="md" />
              <span>{projection.primaryLabel}</span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--edge-text-secondary)]">
              {projection.connectionSummary}
            </div>
          </>
        )}
      </div>

      {projection.showRecovery ? (
        <div className="mb-3 space-y-1.5">
          <TwsRecoverButton
            testId="data-health-recover-tws"
            label={projection.recoveryLabel}
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

      <div className="mb-3">
        <div className={menuSectionHeaderClass(theme)}>Current data</div>
        <div className="space-y-2">
          {projection.sections.currentData.map((row) => (
            <DatasetRow key={row.kind} row={row} />
          ))}
        </div>
      </div>

      {projection.sections.connections.rows.length > 0 ||
      projection.sections.connections.dataPreference ? (
        <div className="mb-3">
          <div className={menuSectionHeaderClass(theme)}>Broker connections</div>
          <div className="space-y-1.5">
            {projection.sections.connections.rows.map((row) => (
              <ConnectionRow key={row.id} row={row} />
            ))}
            {projection.sections.connections.dataPreference ? (
              <div
                className="flex items-start justify-between gap-2 text-[10px]"
                data-testid="data-health-connection-preference"
              >
                <span className="font-medium text-[var(--edge-text-primary)]">
                  Chart data preference
                </span>
                <span className="text-right text-[var(--edge-text-secondary)]">
                  {projection.sections.connections.dataPreference.label}
                </span>
              </div>
            ) : null}
            <div className="text-[10px] text-[var(--edge-text-muted)]">
              {projection.sections.connections.preferenceNote}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-3">
        <div className={menuSectionHeaderClass(theme)}>Recent active incident</div>
        {projection.sections.activeIncident ? (
          <div
            className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-warning)]/30 bg-[var(--edge-warning)]/10 px-2 py-1.5 text-[10px] text-[var(--edge-text-primary)]"
            data-testid="data-health-active-incident"
          >
            {projection.sections.activeIncident.message}
          </div>
        ) : (
          <div
            className="text-[10px] text-[var(--edge-text-muted)]"
            data-testid="data-health-active-incident-empty"
          >
            No active incident
          </div>
        )}
      </div>

      <DataHealthDiagnosticsSection
        theme={theme}
        projection={projection}
        serverHealthLoading={serverHealthLoading}
        serverHealthLoaded={serverHealthLoaded}
      />
    </ChartAnchoredPopover>
  );
}
