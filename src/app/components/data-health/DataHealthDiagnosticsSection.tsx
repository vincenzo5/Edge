"use client";

import { useState } from "react";
import type { Theme } from "@/lib/chartConfig";
import type { HealthUserProjection } from "@/lib/marketData/healthProjection";
import type { ProviderHealthRow } from "@/lib/marketData/health";
import { menuSectionHeaderClass } from "../chart-chrome/headerStyles";
import { formatHealthEventAge } from "./HealthSeverityDot";
import DataHealthLatencySection from "./DataHealthLatencySection";
import { useDataHealth } from "./DataHealthProvider";

type Props = {
  theme: Theme;
  projection: HealthUserProjection;
  serverHealthLoading: boolean;
  serverHealthLoaded: boolean;
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

export default function DataHealthDiagnosticsSection({
  theme,
  projection,
  serverHealthLoading,
  serverHealthLoaded,
}: Props) {
  const { snapshot } = useDataHealth();
  const [expanded, setExpanded] = useState(false);
  const { diagnostics } = projection;

  const hasProviders = diagnostics.providers.length > 0 || (serverHealthLoading && !serverHealthLoaded);
  const hasRouteDiagnostics = diagnostics.routeDiagnostics.length > 0;
  const hasRecoveredEvents = diagnostics.recoveredEvents.length > 0;
  const hasIncidentHistory = diagnostics.incidentHistory.length > 0;

  if (!hasProviders && !hasRouteDiagnostics && !hasRecoveredEvents && !hasIncidentHistory) {
    return (
      <div className="mt-1">
        <DataHealthLatencySection nested />
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
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        className={`${menuSectionHeaderClass(theme)} flex w-full items-center gap-1 text-left hover:text-[var(--edge-text-primary)]`}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        data-testid="data-health-diagnostics-toggle"
      >
        <span aria-hidden>{expanded ? "▾" : "▸"}</span>
        <span>Diagnostics</span>
      </button>

      {expanded ? (
        <div className="mb-3 space-y-3" data-testid="data-health-diagnostics">
          {hasProviders ? (
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
                Providers
              </div>
              <div className="space-y-1.5">
                {serverHealthLoading && !serverHealthLoaded && diagnostics.providers.length === 0 ? (
                  <div
                    className="text-[10px] text-[var(--edge-text-secondary)]"
                    data-testid="data-health-providers-loading"
                  >
                    Loading provider status…
                  </div>
                ) : null}
                {diagnostics.providers.map((provider) => (
                  <ProviderRow key={provider.id} provider={provider} />
                ))}
              </div>
            </div>
          ) : null}

          {hasRouteDiagnostics ? (
            <div data-testid="data-health-route-diagnostics">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
                Route attempts
              </div>
              <ul className="space-y-1 text-[10px] text-[var(--edge-text-secondary)]">
                {diagnostics.routeDiagnostics.map((row) => (
                  <li key={row.datasetId}>
                    {row.datasetId} · {row.source}
                    {row.transport ? ` · ${row.transport}` : ""}
                    {row.cacheTier ? ` · ${row.cacheTier}` : ""}
                    {row.routeAttemptCount > 1 ? ` · ${row.routeAttemptCount} attempts` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasRecoveredEvents ? (
            <div data-testid="data-health-recovered-events">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
                Recovered events
              </div>
              <ul className="space-y-1 text-[10px] text-[var(--edge-text-secondary)]">
                {diagnostics.recoveredEvents.map((event) => (
                  <li key={`${event.message}-${event.at}`}>
                    {event.message} · recovered · {formatHealthEventAge(event.at)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasIncidentHistory ? (
            <div data-testid="data-health-incident-history">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
                Recent incidents
              </div>
              <ul className="space-y-1 text-[10px] text-[var(--edge-text-secondary)]">
                {diagnostics.incidentHistory.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <DataHealthLatencySection nested />
        </div>
      ) : null}

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
    </div>
  );
}
